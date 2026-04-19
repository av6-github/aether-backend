import { attendanceService } from './attendance.service.js';
import { pushToUser, pushToDivision } from '../notifications/socket.server.js';

export const attendanceController = {
  async selfMark(req, res, next) {
    try {
      const session = await attendanceService.markStudentSelf(req.user.userId, req.body);
      res.status(200).json({ success: true, message: 'Attendance registered', data: session });

      // Real-time: notify the student their own attendance was recorded
      setImmediate(() => {
        try {
          pushToUser(req.user.userId, 'attendance:updated', {
            subjectId: session.subjectId,
            date:      session.date,
            status:    session.records.find(r => r.studentId.toString() === req.user.userId)?.status,
          });
        } catch {}
      });
    } catch (err) { next(err); }
  },

  async override(req, res, next) {
    try {
      const session = await attendanceService.facultyOverride(req.user.userId, req.body);
      res.status(200).json({ success: true, message: 'Attendance overridden', data: session });

      // Real-time: notify every affected student
      setImmediate(() => {
        try {
          for (const record of session.records) {
            pushToUser(record.studentId.toString(), 'attendance:updated', {
              subjectId: session.subjectId,
              date:      session.date,
              status:    record.status,
            });
          }
        } catch {}
      });
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
