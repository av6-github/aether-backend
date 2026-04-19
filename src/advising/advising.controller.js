import { advisingService } from './advising.service.js';

export const advisingController = {
  async createNote(req, res, next) {
    try {
      const note = await advisingService.createNote(req.user.userId, req.body);
      res.status(201).json({ success: true, message: 'Advising note created', data: note });
    } catch (err) { next(err); }
  },

  async createBatchNote(req, res, next) {
    try {
      const { division, noteText, category, followUpDate, sharedWithStudent } = req.body;
      const User = (await import('../models/User.model.js')).User;
      const students = await User.find({ role: 'student', division, departmentId: req.user.departmentId });
      
      const notes = [];
      for (const student of students) {
         notes.push(await advisingService.createNote(req.user.userId, {
            studentId: student._id, noteText, category, followUpDate, sharedWithStudent
         }));
      }
      res.status(201).json({ success: true, message: 'Batch notes created', count: notes.length });
    } catch (err) { next(err); }
  },

  async getNotesForStudent(req, res, next) {
    try {
      const notes = await advisingService.getNotesForStudent(req.user.userId, req.params.studentId);
      res.json({ success: true, count: notes.length, data: notes });
    } catch (err) { next(err); }
  },

  async getAllMyNotes(req, res, next) {
    try {
      const notes = await advisingService.getAllMyNotes(req.user.userId);
      res.json({ success: true, count: notes.length, data: notes });
    } catch (err) { next(err); }
  },

  async getMySharedNotes(req, res, next) {
    try {
      const notes = await advisingService.getSharedNotesForStudent(req.user.userId);
      res.json({ success: true, count: notes.length, data: notes });
    } catch (err) { next(err); }
  },

  async getPendingFollowUps(req, res, next) {
    try {
      const notes = await advisingService.getPendingFollowUps(req.user.userId);
      res.json({ success: true, count: notes.length, data: notes });
    } catch (err) { next(err); }
  },

  async markFollowUpDone(req, res, next) {
    try {
      const note = await advisingService.markFollowUpDone(req.params.noteId, req.user.userId);
      res.json({ success: true, data: note });
    } catch (err) { next(err); }
  },

  async createRequest(req, res, next) {
    try {
      const request = await advisingService.createStudentRequest(req.user.userId, req.body);
      res.status(201).json({ success: true, message: 'Advising request submitted', data: request });
    } catch (err) { next(err); }
  },

  async getMyRequests(req, res, next) {
    try {
      const requests = await advisingService.getStudentRequests(req.user.userId);
      res.json({ success: true, data: requests });
    } catch (err) { next(err); }
  },

  async getIncomingRequests(req, res, next) {
    try {
      const requests = await advisingService.getFacultyRequests(req.user.userId);
      res.json({ success: true, data: requests });
    } catch (err) { next(err); }
  },

  async updateRequest(req, res, next) {
    try {
      const request = await advisingService.updateRequest(req.params.requestId, req.user.userId, req.body);
      res.json({ success: true, data: request });
    } catch (err) { next(err); }
  },
};
