import { Attendance, Timetable, User } from '../shared.js';
import { verifyGeoFence } from './geo.util.js';
import mongoose from 'mongoose';

class AttendanceService {
  async markStudentSelf(studentId, data) {
    const { timetableId, day, startTime, studentCoord, date } = data;
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') throw { status: 403, message: 'Students only' };

    const timetable = await Timetable.findById(timetableId).populate('slots.roomId');
    if (!timetable) throw { status: 404, message: 'Timetable not found' };

    const slot = timetable.slots.find(s => s.day === day && s.startTime === startTime);
    if (!slot) throw { status: 404, message: 'Slot not found' };

    // ── Time-window validation ──────────────────────────────────────────────
    // Attendance can only be marked during the slot's actual time window.
    // Skip in development when BYPASS_ATTENDANCE_TIME=true.
    // if (process.env.BYPASS_ATTENDANCE_TIME !== 'true') {
    //   // Convert current UTC time to IST (UTC+5:30) for comparison
    //   const now = new Date();
    //   const istMs = now.getTime() + (5 * 60 + 30) * 60 * 1000;
    //   const ist = new Date(istMs);
    //   const hh = ist.getUTCHours().toString().padStart(2, '0');
    //   const mm = ist.getUTCMinutes().toString().padStart(2, '0');
    //   const nowIST = `${hh}:${mm}`;
    // 
    //   if (nowIST < slot.startTime || nowIST >= slot.endTime) {
    //     throw {
    //       status: 403,
    //       message: `Attendance for this slot can only be marked between ${slot.startTime} and ${slot.endTime}.`,
    //     };
    //   }
    // }
    // ────────────────────────────────────────────────────────────────────────

    // Geo-fence validation
    // Bypassed as per requirements
    // if (slot.roomId && slot.roomId.floorPlanCoordinates) {
    //   const isValid = verifyGeoFence(studentCoord, slot.roomId.floorPlanCoordinates, 50);
    //   if (!isValid) throw { status: 403, message: 'Out of perimeter range. Must be near the classroom.' };
    // }

    const testDate = new Date(date);
    testDate.setHours(0, 0, 0, 0);

    // Upsert the session for the day
    let session = await Attendance.findOne({
      subjectId: slot.subjectId,
      facultyId: slot.facultyId,
      division: timetable.division,
      date: testDate
    });

    if (!session) {
      session = new Attendance({
        timetableSlotRef: { timetableId, day, startTime },
        subjectId: slot.subjectId,
        facultyId: slot.facultyId,
        departmentId: timetable.departmentId,
        division: timetable.division,
        date: testDate,
        records: []
      });
    }

    const existingIndex = session.records.findIndex(r => r.studentId.toString() === studentId.toString());
    if (existingIndex > -1) {
      // Update the existing record instead of throwing an error
      session.records[existingIndex].status = data.status || 'present';
    } else {
      session.records.push({ studentId, status: data.status || 'present' });
    }
    await session.save();

    return session;
  }

  async facultyOverride(facultyId, data) {
    const { subjectId, division, date, updates, timetableId, day, startTime } = data;
    const testDate = new Date(date);
    testDate.setHours(0, 0, 0, 0);

    // Try finding by timetable ref first, then fall back to subjectId/division
    let session = null;
    if (timetableId && day && startTime) {
      session = await Attendance.findOne({
        'timetableSlotRef.timetableId': timetableId,
        'timetableSlotRef.day': day,
        'timetableSlotRef.startTime': startTime,
        date: testDate
      });
    }
    if (!session) {
      session = await Attendance.findOne({ subjectId, facultyId, division, date: testDate });
    }
    if (!session) throw { status: 404, message: 'Session block does not exist for this date' };

    // Apply overrides
    for (const update of updates) {
      const student = await User.findOne({ enrollmentNo: update.studentId });
      if (!student) throw { status: 404, message: `Student with enrollment ${update.studentId} not found` };
      const studentIdStr = student._id.toString();

      const idx = session.records.findIndex(r => r.studentId.toString() === studentIdStr);
      if (idx > -1) {
        session.records[idx].status = update.status;
        if (update.remarks !== undefined) session.records[idx].remarks = update.remarks;
      } else {
        session.records.push({ studentId: student._id, status: update.status, remarks: update.remarks || '' });
      }
    }

    await session.save();
    return session;
  }

  async getStudentReport(studentId, departmentId) {
    const records = await Attendance.find({
      departmentId,
      'records.studentId': studentId
    }).populate('subjectId', 'name code');

    let totalClasses = 0;
    let attendedClasses = 0;

    const breakdown = records.reduce((acc, session) => {
      const rec = session.records.find(r => r.studentId.toString() === studentId.toString());
      if (!rec) return acc;
      
      const subName = session.subjectId.name;
      if (!acc[subName]) acc[subName] = { total: 0, attended: 0 };
      
      acc[subName].total += 1;
      totalClasses += 1;
      
      if (rec.status === 'present' || rec.status === 'late') {
        acc[subName].attended += 1;
        attendedClasses += 1;
      }
      return acc;
    }, {});

    const subjects = Object.entries(breakdown).map(([subject, { total, attended }]) => ({
      subject,
      total,
      attended,
      percent: total === 0 ? 0 : Math.round((attended / total) * 100),
    }));

    return {
      overallPercent: totalClasses === 0 ? 0 : Math.round((attendedClasses / totalClasses) * 100),
      subjects,
    };
  }

  async getStudentDetailedReport(studentId, departmentId) {
    const records = await Attendance.find({
      departmentId,
      'records.studentId': studentId
    })
      .populate('subjectId', 'name code')
      .populate('facultyId', 'name')
      .sort({ date: -1 });

    const sessions = records.map(session => {
      const rec = session.records.find(r => r.studentId.toString() === studentId.toString());
      return {
        _id: session._id,
        date: session.date,
        subject: session.subjectId?.name,
        subjectCode: session.subjectId?.code,
        faculty: session.facultyId?.name,
        startTime: session.timetableSlotRef?.startTime,
        day: session.timetableSlotRef?.day,
        timetableId: session.timetableSlotRef?.timetableId,
        status: rec ? rec.status : null,
        remarks: rec ? rec.remarks : null,
        hasRecord: !!rec,
      };
    });

    // Summary by subject
    const subjectMap = {};
    sessions.forEach(s => {
      if (!subjectMap[s.subject]) subjectMap[s.subject] = { total: 0, present: 0, absent: 0, late: 0, code: s.subjectCode };
      subjectMap[s.subject].total++;
      if (s.status === 'present') subjectMap[s.subject].present++;
      else if (s.status === 'absent') subjectMap[s.subject].absent++;
      else if (s.status === 'late') subjectMap[s.subject].late++;
    });

    const subjectSummary = Object.entries(subjectMap).map(([name, d]) => ({
      name, code: d.code, total: d.total, present: d.present, absent: d.absent, late: d.late,
      percent: d.total ? Math.round(((d.present + d.late) / d.total) * 100) : 0,
    }));

    const totalClasses = sessions.length;
    const attended = sessions.filter(s => s.status === 'present' || s.status === 'late').length;

    return {
      overallPercent: totalClasses ? Math.round((attended / totalClasses) * 100) : 0,
      totalClasses,
      attended,
      absent: totalClasses - attended,
      subjectSummary,
      sessions,
    };
  }

  async getSessionAttendance(timetableId, day, startTime, date) {
    const testDate = new Date(date);
    testDate.setHours(0, 0, 0, 0);

    const session = await Attendance.findOne({
      'timetableSlotRef.timetableId': timetableId,
      'timetableSlotRef.day': day,
      'timetableSlotRef.startTime': startTime,
      date: testDate
    }).populate('records.studentId', 'name enrollmentNo division');

    return session || { records: [] };
  }
}

export const attendanceService = new AttendanceService();
