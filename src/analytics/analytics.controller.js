import { analyticsService } from './analytics.service.js';

export const analyticsController = {
  async hodDashboard(req, res, next) {
    try {
      const { academicYear } = req.query;
      const data = await analyticsService.getHodDashboard(req.user.departmentId, academicYear);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  },

  async deanDashboard(req, res, next) {
    try {
      const data = await analyticsService.getDeanDashboard();
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  },

  async attendanceStats(req, res, next) {
    try {
      const data = await analyticsService.getAttendanceStats(req.user.departmentId);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  },

  async syllabusStats(req, res, next) {
    try {
      const { academicYear = '2026-2027' } = req.query;
      const data = await analyticsService.getSyllabusStats(req.user.departmentId, academicYear);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  },

  async issueStats(req, res, next) {
    try {
      const data = await analyticsService.getIssueStats();
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  },

  async eventStats(req, res, next) {
    try {
      const data = await analyticsService.getEventStats(req.user.departmentId);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  },

  // Student personal analytics — safe, never throws
  async studentAnalytics(req, res, next) {
    try {
      const data = await analyticsService.getStudentAnalytics(req.user.userId, req.user.departmentId);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  },
};
