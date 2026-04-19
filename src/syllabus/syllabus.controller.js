import { syllabusService } from './syllabus.service.js';

export const syllabusController = {
  async initTracker(req, res, next) {
    try {
      const result = await syllabusService.initializeSyllabus(
        req.user.userId, req.user.departmentId, req.body
      );
      res.status(201).json({ success: true, message: 'Syllabus initialized', data: result });
    } catch (err) { next(err); }
  },

  async updateTopic(req, res, next) {
    try {
      const { topicId, status, notes } = req.body;
      const result = await syllabusService.updateTopicCompletion(
        req.user.userId, req.params.trackerId, topicId, status, notes
      );
      res.status(200).json({ success: true, message: 'Topic status updated', data: result });
    } catch (err) { next(err); }
  },

  async myTrackers(req, res, next) {
    try {
      const result = await syllabusService.getMyTrackers(req.user.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async studentOverview(req, res, next) {
    try {
      // Auto-inject semester from JWT token if not provided in query
      const semester = req.query.semester || req.user.semester;
      const currentYear = new Date().getFullYear();
      const academicYear = req.query.academicYear || `${currentYear}-${currentYear + 1}`;
      const result = await syllabusService.getStudentProgressOverview(
        req.user.departmentId, semester, academicYear
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async getCoordinationNodes(req, res, next) {
    try {
      const { SyllabusProgress } = await import('../models/SyllabusProgress.model.js');
      const { subjectId } = req.params;
      
      const trackers = await SyllabusProgress.find({ subjectId })
        .populate('facultyId', 'name email role')
        .sort({ completionPercent: -1 });
        
      res.status(200).json({ success: true, data: trackers });
    } catch (err) { next(err); }
  }
};
