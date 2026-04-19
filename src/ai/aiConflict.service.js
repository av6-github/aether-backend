import { GoogleGenerativeAI } from '@google/generative-ai';
import { Timetable, EventRequest, Room } from '../shared.js';
import mongoose from 'mongoose';

class AIConflictService {
  constructor() {
    this.model = null;
  }

  getModel() {
    if (!this.model) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return null;
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
    return this.model;
  }

  /**
   * Suggest 3 alternative non-conflicting slots for an event request.
   */
  async suggestAlternativeSlots(venueName, originalStartTime, originalEndTime) {
    const aiModel = this.getModel();
    if (!aiModel) return null;

    // 1. Gather all bookings for this venue for the next 7 days
    const startDate = new Date(originalStartTime);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    // Get room ID from name
    const room = await Room.findOne({ name: new RegExp(`^${venueName}$`, 'i') });
    
    // Academic slots from Timetable
    const timetables = await Timetable.find({
      status: 'approved',
      'slots.roomId': room?._id
    }).populate('slots.subjectId', 'name');

    const academicBookings = [];
    timetables.forEach(tt => {
      tt.slots.forEach(slot => {
        if (slot.roomId?.toString() === room?._id.toString()) {
          academicBookings.push({
            day: slot.day,
            start: slot.startTime,
            end: slot.endTime,
            subject: slot.subjectId?.name
          });
        }
      });
    });

    // Operational slots from approved EventRequests
    const events = await EventRequest.find({
      currentStage: { $in: ['approved', 'hod', 'dean', 'council'] },
      venue: new RegExp(`^${venueName}$`, 'i'),
      startTime: { $gte: startDate },
      endTime: { $lte: endDate }
    });

    const eventBookings = events.map(e => ({
      title: e.title,
      start: e.startTime,
      end: e.endTime
    }));

    const prompt = `
      You are an AI Campus Scheduler. An event request at "${venueName}" for ${originalStartTime} to ${originalEndTime} has a conflict.
      Here is the current booking schedule for this venue for the week:
      
      ACADEMIC RECURRING CLASSES (Every Week):
      ${JSON.stringify(academicBookings, null, 2)}
      
      ONE-OFF APPROVED EVENTS:
      ${JSON.stringify(eventBookings, null, 2)}
      
      TASK: Suggest 3 alternative 2-hour time slots within the next 7 days that do not conflict with ANY of the above.
      - Ensure the slots are between 9:00 AM and 6:00 PM (Working Hours).
      - Do not suggest slots on Sundays.
      - Return ONLY a JSON array of 3 strings in the format "YYYY-MM-DD HH:mm - HH:mm".
      - Example output: ["2024-05-20 10:00 - 12:00", "2024-05-21 14:00 - 16:00", "2024-05-20 15:00 - 17:00"]
      - Do not include any other text or markdown markers.
    `;

    try {
      const result = await aiModel.generateContent(prompt);
      let text = result.response.text();
      // Robust JSON extraction
      const jsonMatch = text.match(/\[.*\]/s);
      if (!jsonMatch) return [];
      
      const suggestions = JSON.parse(jsonMatch[0]);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (err) {
      console.error('[AI Conflict Service Error]', err);
      return [];
    }
  }
}

export const aiConflictService = new AIConflictService();
