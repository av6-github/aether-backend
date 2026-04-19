import { EventRequest, Timetable, User, getPublisher } from '../shared.js';
import mongoose from 'mongoose';
import { generateEventCertificate } from '../utils/pdf.util.js';
import { notificationService } from '../notifications/notification.service.js';

// Checks overlaps against all approved timetables containing a specific room/venue
async function checkVenueClash(venueName, startTime, endTime) {
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(startTime).getDay()];
  const startHour = String(new Date(startTime).getHours()).padStart(2, '0') + ':' + String(new Date(startTime).getMinutes()).padStart(2, '0');
  const endHour = String(new Date(endTime).getHours()).padStart(2, '0') + ':' + String(new Date(endTime).getMinutes()).padStart(2, '0');

  // Look up if any timetable has a slot exactly in this venue right now
  const clash = await Timetable.findOne({
    status: 'approved',
  }).populate({
    path: 'slots.roomId',
    match: { name: new RegExp(venueName, 'i') } // Basic venue search match
  });

  if (!clash) return false;

  // Manual strict comparison checking overlap logic (simplified for prototype)
  const exactSlot = clash?.slots.find(s => s.day === dayOfWeek && s.roomId && s.roomId.name === venueName);
  if (exactSlot) {
    if (startHour < exactSlot.endTime && endHour > exactSlot.startTime) return true;
  }

  // Also check against operational events (EventRequests) — any non-rejected event holds the venue
  const operationalClash = await EventRequest.findOne({
    currentStage: { $in: ['council', 'hod', 'dean', 'approved'] },
    venue: new RegExp(`^${venueName}$`, 'i'),
    $or: [
      { startTime: { $lt: endTime, $gte: startTime } },
      { endTime: { $gt: startTime, $lte: endTime } },
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
    ]
  });

  if (operationalClash) return true;

  return false;
}

function calculateApprovalProbability(leadTimeDays, venueContentionCount, clubHistory) {
  let score = 50; // Base 50%
  
  // Lead time: +2% for each day advance, up to 14 days (+28%)
  score += Math.min(leadTimeDays * 2, 28);
  
  // Venue Contention: -5% for each other event in the same week
  score -= (venueContentionCount * 5);
  
  // Historical Success: assume 80% for now (mock logic)
  score += 10;
  
  return Math.min(Math.max(score, 5), 99); // Clamp 5-99%
}

class EventService {
  async createRequest(user, data) {
    const { title, description, venue, startTime, endTime, expectedAttendance, templateType } = data;
    
    // Automatic 1-step algorithmic clash check
    const isClashing = await checkVenueClash(venue, startTime, endTime);

    if (isClashing) {
      let suggestions = [];
      try {
        const { aiConflictService } = await import('../ai/aiConflict.service.js');
        suggestions = await aiConflictService.suggestAlternativeSlots(venue, startTime, endTime);
      } catch (aiErr) {
        console.error('[AI Conflict Suggestion Failed]', aiErr);
      }

      throw { 
        status: 409, 
        message: `Validation Failed: Conflict detected. ${venue} is already booked during this time.`,
        data: {
          conflict: true,
          suggestions: suggestions || []
        }
      };
    }

    let resources = ['AC', 'Wi-Fi', 'Smart Board'];
    if (templateType === 'hackathon') {
      resources.push('All IT Labs', 'Guard Security');
      // Dispatch mock notifications
      console.log('[Notification] Sent IT Dept Permission Letter to it@spit.ac.in');
      console.log('[Notification] Sent Guard CC Copy to security@spit.ac.in');
    } else if (templateType === 'case_study') {
      resources.push('4 Classrooms', 'Department Office');
    } else {
      resources.push('1 Classroom');
    }

    const leadTimeDays = Math.floor((new Date(startTime) - new Date()) / (1000 * 60 * 60 * 24));
    const probability = calculateApprovalProbability(leadTimeDays, 0, null);

    const event = await EventRequest.create({
      requestedBy: user.userId,
      departmentId: user.departmentId,
      title,
      description,
      venue,
      startTime,
      endTime,
      expectedAttendance,
      templateType,
      resources,
      conflictChecked: true,
      conflictResult: { 
        msg: 'No conflict detected.',
        probability: probability 
      },
      currentStage: 'council', // Next up in chain
      chain: []
    });

    return event;
  }

  async getPendingRequests(role, departmentId) {
    if (role === 'council') {
      return EventRequest.find({ currentStage: 'council' })
        .populate('requestedBy', 'name email subRole')
        .sort({ startTime: 1 });
    }
    // If HOD, fetch all pending in HOD stage within department
    if (role === 'hod') {
      return EventRequest.find({ currentStage: 'hod', departmentId })
        .populate('requestedBy', 'name email subRole')
        .sort({ startTime: 1 });
    }
    // If Dean, fetch all events pending final dean approval across system
    if (role === 'dean') {
      return EventRequest.find({ currentStage: 'dean' })
        .populate('requestedBy', 'name email subRole')
        .populate('departmentId', 'name')
        .sort({ startTime: 1 });
    }
    return [];
  }

  async processApproval(eventId, actorUser, status, comment) {
    const event = await EventRequest.findById(eventId);
    if (!event) throw { status: 404, message: 'Event not found' };

    // Record the trace
    event.chain.push({
      role: actorUser.role,
      userId: actorUser.userId,
      status,
      comment,
      timestamp: new Date()
    });

    if (status === 'rejected') {
      event.currentStage = 'rejected';
      // Notify requester of rejection
      notificationService.send(event.requestedBy, {
        title: 'Event Request Rejected',
        body: `Your event "${event.title}" was rejected by ${actorUser.role.toUpperCase()}. Comment: ${comment || 'No comment.'}`,
        type: 'event_rejected',
        metadata: { eventId: event._id }
      }).catch(console.error);
    } else if (status === 'approved') {
      if (actorUser.role === 'council') {
        event.currentStage = 'hod';
        // Notify all HODs of this department that there is a pending event for review
        const hods = await User.find({ role: 'hod', departmentId: event.departmentId });
        hods.forEach(hod => {
          notificationService.send(hod._id, {
            title: 'New Event Pending Your Review',
            body: `Event "${event.title}" has been approved by Student Council and requires HOD review.`,
            type: 'event_pending_review',
            metadata: { eventId: event._id }
          }).catch(console.error);
        });
      } else if (actorUser.role === 'hod') {
        event.currentStage = 'dean';
        // Notify the Dean(s)
        const deans = await User.find({ role: 'dean' });
        deans.forEach(dean => {
          notificationService.send(dean._id, {
            title: 'Event Awaiting Final Approval',
            body: `Event "${event.title}" has been approved by HOD and requires Dean's final approval.`,
            type: 'event_pending_review',
            metadata: { eventId: event._id }
          }).catch(console.error);
        });
      } else if (actorUser.role === 'dean') {
        event.currentStage = 'approved';
        // Generate document
        try {
          const reqUser = await User.findById(event.requestedBy);
          event.approvalDocURL = await generateEventCertificate(event, reqUser || { name: 'Unknown' });
        } catch (err) {
          console.error('[Document Generation Error]', err);
        }
        // Notify requester of final approval
        notificationService.send(event.requestedBy, {
          title: '🎉 Event Fully Approved!',
          body: `Your event "${event.title}" has been approved by the Dean. Your approval certificate is ready.`,
          type: 'event_approved',
          metadata: { eventId: event._id }
        }).catch(console.error);
      }
    }

    await event.save();
    return event;
  }

  async getMyEvents(studentId) {
    return EventRequest.find({ requestedBy: studentId })
      .sort({ createdAt: -1 })
      .populate('requestedBy', 'name email')
      .populate('departmentId', 'name');
  }

  /**
   * Council / HOD / Dean: get all events they have personally approved or rejected.
   * Searches the chain[] array for any step where userId === actorId.
   */
  async getMyApprovals(actorId) {
    return EventRequest.find({
      'chain.userId': new mongoose.Types.ObjectId(actorId),
    })
      .populate('requestedBy', 'name email')
      .populate('departmentId', 'name')
      .sort({ updatedAt: -1 });
  }

  async getAllEvents() {
    return EventRequest.find({
      currentStage: { $in: ['approved', 'council', 'hod', 'dean'] }
    })
      .populate('requestedBy', 'name')
      .sort({ startTime: 1 });
  }
}

export const eventService = new EventService();
