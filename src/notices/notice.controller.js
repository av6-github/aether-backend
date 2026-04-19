import { noticeService } from './notice.service.js';
import { pushToDept, pushToDivision, pushToUser, getIO } from '../notifications/socket.server.js';
import { notificationService } from '../notifications/notification.service.js';
import { User } from '../shared.js';

export const noticeController = {
  async publish(req, res, next) {
    try {
      const notice = await noticeService.publish(req.user, req.body);
      res.status(201).json({ success: true, message: 'Notice published', data: notice });

      // ── Real-time + FCM push — fire-and-forget after response ──────────────
      setImmediate(async () => {
        try {
          const { targetDivisions = [], targetSemesters = [] } = notice;
          const deptId = req.user.departmentId.toString();

          // 1. Socket.io real-time — push notice:new to the right rooms
          const socketPayload = {
            id:        notice._id,
            title:     notice.title,
            body:      notice.body,
            priority:  notice.priority,
            createdAt: notice.createdAt,
          };

          if (targetDivisions.length > 0) {
            // Push only to matching division rooms
            for (const div of targetDivisions) {
              pushToDivision(deptId, div, 'notice:new', socketPayload);
            }
          } else {
            // Broadcast to entire department
            pushToDept(deptId, 'notice:new', socketPayload);
          }

          // 2. FCM offline push — find targeted students and send per-user
          const studentQuery = {
            departmentId: req.user.departmentId,
            role:         'student',
            isActive:     true,
          };
          if (targetDivisions.length > 0) studentQuery.division  = { $in: targetDivisions };
          if (targetSemesters.length > 0) studentQuery.semester   = { $in: targetSemesters };

          const students = await User.find(studentQuery).select('_id').lean();

          for (const student of students) {
            notificationService.send(student._id, {
              title:    `📢 ${notice.title}`,
              body:     notice.body,
              type:     'notice',
              metadata: { noticeId: notice._id.toString() },
            }).catch(err => console.error('[Notice FCM]', err.message));
          }

          console.log(`[Notice] "${notice.title}" → socket broadcast + FCM push to ${students.length} student(s)`);
        } catch (err) {
          console.error('[Notice] Broadcast error:', err.message);
        }
      });
    } catch (err) { next(err); }
  },

  async getNotices(req, res, next) {
    try {
      const notices = await noticeService.getForUser(req.user);
      res.json({ success: true, count: notices.length, data: notices });
    } catch (err) { next(err); }
  },

  async getMyNotices(req, res, next) {
    try {
      const notices = await noticeService.getMyNotices(req.user.userId);
      res.json({ success: true, count: notices.length, data: notices });
    } catch (err) { next(err); }
  },

  async deleteNotice(req, res, next) {
    try {
      const result = await noticeService.delete(req.params.id, req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  },
};
