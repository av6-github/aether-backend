import { timetableService } from './timetable.service.js';
import { getPublisher } from '../shared.js';

export const timetableController = {
  async upload(req, res, next) {
    try {
      const timetable = await timetableService.upload({
        departmentId: req.user.departmentId,
        uploadedBy: req.user.userId,
        ...req.body,
      });
      // Notify HOD (via Redis pub/sub wrapper)
      try {
        const pub = getPublisher();
        pub.publish('notifications', JSON.stringify({
          type: 'timetable_pending_review',
          timetableId: timetable._id.toString(),
          departmentId: req.user.departmentId,
          uploadedBy: req.user.userId,
        }));
      } catch (err) {
        console.warn('Redis pub failed, continuing:', err.message);
      }
      res.status(201).json({ success: true, data: timetable });
    } catch (err) { next(err); }
  },

  async getPending(req, res, next) {
    try {
      const timetables = await timetableService.getPendingForHOD(req.user.userId);
      res.json({ success: true, data: timetables });
    } catch (err) { next(err); }
  },

  async review(req, res, next) {
    try {
      const { status, comment } = req.body;
      const timetable = await timetableService.approveOrReject(
        req.params.id, req.user.userId, status, comment
      );
      res.json({ success: true, data: timetable });
    } catch (err) { next(err); }
  },

  async getMyTimetable(req, res, next) {
    try {
      let data;
      if (req.user.role === 'student' || req.user.role === 'council') {
        // division is now in the JWT — no DB lookup needed
        const division = req.user.division;
        if (!division) throw { status: 400, message: 'No division assigned to your account. Contact admin.' };

        // Default to semester assigned to user if not provided as query params
        const semester = req.query.semester ? Number(req.query.semester) : (req.user.semester || 3);
        const year = new Date().getFullYear();
        const academicYear = req.query.academicYear || `${year}-${year + 1}`;  // e.g. 2026-2027

        data = await timetableService.getForStudent(
          req.user.departmentId, division, semester, academicYear
        );
      } else if (req.user.role === 'faculty') {
        data = await timetableService.getForFaculty(req.user.userId);
      }
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getDepartmentTimetables(req, res, next) {
    try {
      const data = await timetableService.getAllForDept(req.user.departmentId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getNextClass(req, res, next) {
    try {
      const division = req.user.division;
      if (!division) throw { status: 400, message: 'No division assigned. Contact admin.' };
      const semester = req.query.semester ? Number(req.query.semester) : (req.user.semester || 3);
      const year = new Date().getFullYear();
      const academicYear = req.query.academicYear || `${year}-${year + 1}`;
      const data = await timetableService.getNextClass(
        req.user.departmentId, division, semester, academicYear
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getRoomAvailability(req, res, next) {
    try {
      const { date, startTime, endTime } = req.query;
      const data = await timetableService.getRoomAvailability(
        req.params.id, date, startTime, endTime
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getVacantRooms(req, res, next) {
    try {
      const { date, time } = req.query;
      const data = await timetableService.getVacantRooms(date, time);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getMySubmissions(req, res, next) {
    try {
      const data = await timetableService.getMySubmissions(req.user.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};
