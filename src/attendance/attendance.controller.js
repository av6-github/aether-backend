import { attendanceService } from './attendance.service.js';

export const attendanceController = {
  async selfMark(req, res, next) {
    try {
      const session = await attendanceService.markStudentSelf(req.user.userId, req.body);
      res.status(200).json({ success: true, message: 'Attendance registered', data: session });
    } catch (err) { next(err); }
  },

  async override(req, res, next) {
    try {
      const session = await attendanceService.facultyOverride(req.user.userId, req.body);
      res.status(200).json({ success: true, message: 'Attendance overridden', data: session });
    } catch (err) { next(err); }
  },

  async myReport(req, res, next) {
    try {
      const report = await attendanceService.getStudentReport(req.user.userId, req.user.departmentId);
      res.status(200).json({ success: true, data: report });
    } catch (err) { next(err); }
  },

  async myDetailedReport(req, res, next) {
    try {
      const report = await attendanceService.getStudentDetailedReport(req.user.userId, req.user.departmentId);
      res.status(200).json({ success: true, data: report });
    } catch (err) { next(err); }
  },

  async getSession(req, res, next) {
    try {
      const { timetableId, day, startTime, date } = req.query;
      const session = await attendanceService.getSessionAttendance(timetableId, day, startTime, date);
      res.json({ success: true, data: session });
    } catch (err) { next(err); }
  }
};
