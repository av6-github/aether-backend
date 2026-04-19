import { noticeService } from './notice.service.js';

export const noticeController = {
  async publish(req, res, next) {
    try {
      const notice = await noticeService.publish(req.user, req.body);
      res.status(201).json({ success: true, message: 'Notice published', data: notice });
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
