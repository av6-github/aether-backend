import { Timetable, User, cacheGet, cacheSet, cacheDel } from '../shared.js';
import { detectTimetableClashes } from './clashDetection.util.js';
import mongoose from 'mongoose';
import { notificationService } from '../notifications/notification.service.js';

const CACHE_TTL = 600;  // 10 minutes

class TimetableService {
  async upload(data) {
    // Get all existing APPROVED timetables for this dept/division/semester
    const existing = await Timetable.find({
      departmentId: data.departmentId,
      division: data.division,
      semester: data.semester,
      academicYear: data.academicYear,
      status: 'approved',
    });

    // Build list of all existing approved slots across sections
    const existingSlots = existing.flatMap(t => 
      t.slots.map(s => ({
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        facultyId: s.facultyId.toString(),
        roomId: s.roomId.toString(),
      }))
    );

    const incomingSlots = data.slots.map(s => ({
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      facultyId: s.facultyId.toString(),
      roomId: s.roomId.toString(),
    }));

    const clashResult = detectTimetableClashes(incomingSlots, existingSlots);

    if (clashResult.hasClash) {
      throw {
        status: 409,
        message: 'Timetable has scheduling conflicts',
        data: clashResult,
      };
    }

    const timetable = await Timetable.create({
      ...data,
      departmentId: new mongoose.Types.ObjectId(data.departmentId),
      uploadedBy: new mongoose.Types.ObjectId(data.uploadedBy),
      status: 'pending',
    });

    return timetable;
  }

  async getPendingForHOD(hodId) {
    const hodUser = await User.findById(hodId);
    if (!hodUser) throw { status: 404, message: 'HOD not found' };

    return Timetable.find({
      departmentId: hodUser.departmentId,
      status: 'pending',
    }).populate('uploadedBy', 'name email')
      .populate('slots.subjectId', 'name code')
      .populate('slots.facultyId', 'name')
      .populate('slots.roomId', 'name building floor')
      .sort({ createdAt: -1 });
  }

  async approveOrReject(timetableId, hodId, action, comment) {
    const timetable = await Timetable.findById(timetableId);
    if (!timetable) throw { status: 404, message: 'Timetable not found' };
    if (timetable.status !== 'pending') throw { status: 400, message: 'Already processed' };

    const hod = await User.findById(hodId);
    if (!hod || hod.departmentId.toString() !== timetable.departmentId.toString()) {
      throw { status: 403, message: 'Not authorized for this department' };
    }

    timetable.status = action;
    timetable.hodComment = comment;
    if (action === 'approved') timetable.approvedAt = new Date();
    await timetable.save();

    await cacheDel(`timetable:dept:${timetable.departmentId}:div:${timetable.division}:sem:${timetable.semester}`);

    // Notify the faculty who uploaded the timetable
    const label = `Sem ${timetable.semester} Div ${timetable.division} (${timetable.academicYear})`;
    const notifTitle = action === 'approved'
      ? `✅ Timetable Approved`
      : `❌ Timetable Rejected`;
    const notifBody = action === 'approved'
      ? `Your timetable for ${label} has been approved by the HOD and is now live.${comment ? ` Remark: ${comment}` : ''}`
      : `Your timetable for ${label} was rejected by the HOD. Remark: ${comment || 'No remark provided.'}`;

    notificationService.send(timetable.uploadedBy, {
      title: notifTitle,
      body: notifBody,
      type: 'timetable_reviewed',
      metadata: { timetableId: timetable._id }
    }).catch(console.error);

    return timetable;
  }

  async getForStudent(departmentId, division, semester, academicYear) {
    const cacheKey = `timetable:dept:${departmentId}:div:${division}:sem:${semester}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const timetable = await Timetable.findOne({
      departmentId, division, semester, academicYear, status: 'approved'
    }).populate('slots.subjectId', 'name code')
      .populate('slots.facultyId', 'name')
      .populate('slots.roomId', 'name building floor floorPlanCoordinates');

    if (timetable) await cacheSet(cacheKey, timetable, CACHE_TTL);

    return timetable;
  }

  async getForFaculty(facultyId) {
    const cacheKey = `timetable:faculty:${facultyId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const timetables = await Timetable.find({
      'slots.facultyId': new mongoose.Types.ObjectId(facultyId),
      status: 'approved',
    }).populate('slots.subjectId', 'name code')
      .populate('slots.roomId', 'name building floor');

    await cacheSet(cacheKey, timetables, CACHE_TTL);
    return timetables;
  }

  async getAllForDept(departmentId) {
    return Timetable.find({ departmentId, status: 'approved' })
      .populate('slots.subjectId', 'name code')
      .populate('slots.facultyId', 'name')
      .populate('slots.roomId', 'name building floor');
  }

  /**
   * Returns the single next upcoming class slot for a student based on current time.
   */
  async getNextClass(departmentId, division, semester, academicYear) {
    const timetable = await this.getForStudent(departmentId, division, semester, academicYear);
    if (!timetable) return null;

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const todayIdx = now.getDay();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Convert HH:MM to total minutes
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    // Check today first, then roll over to upcoming days
    for (let offset = 0; offset < 7; offset++) {
      const dayIdx = (todayIdx + offset) % 7;
      const dayName = DAYS[dayIdx];

      const slotsForDay = timetable.slots
        .filter(s => s.day === dayName)
        .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

      for (const slot of slotsForDay) {
        const slotStart = toMin(slot.startTime);
        // On today, only show future classes; on future days show all classes
        if (offset > 0 || slotStart > nowMinutes) {
          return {
            day: dayName,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subject: slot.subjectId,
            faculty: slot.facultyId,
            room: slot.roomId,
            isToday: offset === 0,
          };
        }
      }
    }
    return null; // No upcoming class found in the next 7 days
  }

  /**
   * Check if a given room is currently free (right now) or within a queried time window.
   */
  async getRoomAvailability(roomId, queryDate, startTime, endTime) {
    const { Room } = await import('../shared.js');
    const room = await Room.findById(roomId);
    if (!room) throw { status: 404, message: 'Room not found' };

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateToCheck = queryDate ? new Date(queryDate) : new Date();
    const dayName = DAYS[dateToCheck.getDay()];

    const queryStart = startTime || `${String(dateToCheck.getHours()).padStart(2,'0')}:${String(dateToCheck.getMinutes()).padStart(2,'0')}`;
    const queryEnd = endTime || `${String(dateToCheck.getHours() + 1).padStart(2,'0')}:${String(dateToCheck.getMinutes()).padStart(2,'0')}`;

    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const qStart = toMin(queryStart);
    const qEnd = toMin(queryEnd);

    // Check academic timetables
    const timetables = await Timetable.find({
      'slots.roomId': new mongoose.Types.ObjectId(roomId),
      status: 'approved',
    });

    let clashingSlot = null;
    for (const tt of timetables) {
      const clash = tt.slots.find(s =>
        s.roomId?.toString() === roomId &&
        s.day === dayName &&
        toMin(s.startTime) < qEnd &&
        toMin(s.endTime) > qStart
      );
      if (clash) { clashingSlot = clash; break; }
    }

    // Check operational events (EventRequests)
    const { EventRequest } = await import('../shared.js');
    const opStart = new Date(dateToCheck);
    const [qsh, qsm] = queryStart.split(':').map(Number);
    const [qeh, qem] = queryEnd.split(':').map(Number);
    opStart.setHours(qsh, qsm, 0, 0);
    const opEnd = new Date(dateToCheck);
    opEnd.setHours(qeh, qem, 0, 0);

    const opClash = await EventRequest.findOne({
      currentStage: 'approved',
      venue: new RegExp(`^${room.name}$`, 'i'),
      $or: [
        { startTime: { $lt: opEnd, $gte: opStart } },
        { endTime: { $gt: opStart, $lte: opEnd } },
        { startTime: { $lte: opStart }, endTime: { $gte: opEnd } }
      ]
    });

    const isFree = !clashingSlot && !opClash;
    return {
      room,
      isFree,
      day: dayName,
      queryWindow: { start: queryStart, end: queryEnd },
      conflict: clashingSlot
        ? { type: 'academic', slot: clashingSlot }
        : opClash
        ? { type: 'event', event: { title: opClash.title, venue: opClash.venue } }
        : null,
    };
  }

  /**
   * Find all currently vacant rooms.
   */
  async getVacantRooms(queryDate, queryTime) {
    const { Room } = await import('../shared.js');
    const rooms = await Room.find();
    
    // Default to right now if not provided
    const dateToCheck = queryDate ? new Date(queryDate) : new Date();
    
    let timeStr = queryTime;
    if (!timeStr) {
      timeStr = `${String(dateToCheck.getHours()).padStart(2,'0')}:${String(dateToCheck.getMinutes()).padStart(2,'0')}`;
    }

    const vacantRooms = [];
    for (const room of rooms) {
      try {
        const avail = await this.getRoomAvailability(room._id, dateToCheck, timeStr, null);
        if (avail.isFree) {
          vacantRooms.push({
            _id: room._id,
            name: room.name,
            building: room.building,
            floor: room.floor,
            capacity: room.capacity
          });
        }
      } catch (err) {
        console.error('Error checking room availability', room.name, err);
      }
    }
    return vacantRooms;
  }

  /**
   * Returns all timetables submitted by a specific faculty member,
   * including their approval status and any HOD remarks.
   */
  async getMySubmissions(facultyId) {
    return Timetable.find({ uploadedBy: new mongoose.Types.ObjectId(facultyId) })
      .populate('slots.subjectId', 'name code')
      .populate('slots.roomId', 'name building floor')
      .sort({ createdAt: -1 });
  }
}

export const timetableService = new TimetableService();
