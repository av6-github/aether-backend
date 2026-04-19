import { notificationService } from './notification.service.js';

export const notificationController = {
  async getAll(req, res, next) {
    try {
      const notifs = await notificationService.getAll(req.user.userId);
      res.status(200).json({ success: true, data: notifs });
    } catch (err) { next(err); }
  },

  async getUnread(req, res, next) {
    try {
      const notifs = await notificationService.getUnread(req.user.userId);
      res.status(200).json({ success: true, count: notifs.length, data: notifs });
    } catch (err) { next(err); }
  },

  async markRead(req, res, next) {
    try {
      const notif = await notificationService.markRead(req.user.userId, req.params.id);
      res.status(200).json({ success: true, data: notif });
    } catch (err) { next(err); }
  },

  async markAllRead(req, res, next) {
    try {
      await notificationService.markAllRead(req.user.userId);
      res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (err) { next(err); }
  }
};
