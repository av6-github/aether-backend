import { clubService } from './club.service.js';

export const clubController = {
  async create(req, res, next) {
    try {
      const club = await clubService.create(req.user, req.body);
      res.status(201).json({ success: true, message: 'Club created', data: club });
    } catch (err) { next(err); }
  },

  async list(req, res, next) {
    try {
      const clubs = await clubService.list(req.query.category);
      res.json({ success: true, count: clubs.length, data: clubs });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const club = await clubService.getById(req.params.id);
      res.json({ success: true, data: club });
    } catch (err) { next(err); }
  },

  async requestJoin(req, res, next) {
    try {
      const result = await clubService.requestJoin(req.params.id, req.user.userId, req.body.message);
      res.json({ success: true, message: 'Join request submitted — awaiting approval', data: result });
    } catch (err) { next(err); }
  },

  async reviewJoinRequest(req, res, next) {
    try {
      const { decision } = req.body; // 'approved' | 'rejected'
      if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ success: false, message: "decision must be 'approved' or 'rejected'" });
      }
      const result = await clubService.reviewJoinRequest(
        req.params.id, req.params.requestId, req.user, decision
      );
      res.json({ success: true, message: `Request ${decision}`, data: result });
    } catch (err) { next(err); }
  },

  async getPendingRequests(req, res, next) {
    try {
      const data = await clubService.getPendingRequestsForMyClubs(req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async getMySentRequests(req, res, next) {
    try {
      const data = await clubService.getMySentRequests(req.user.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async leave(req, res, next) {
    try {
      await clubService.leave(req.params.id, req.user.userId);
      res.json({ success: true, message: 'Left club successfully' });
    } catch (err) { next(err); }
  },

  async sendAlert(req, res, next) {
    try {
      const result = await clubService.sendAlert(req.params.id, req.user, req.body);
      res.json({ success: true, message: `Alert sent to ${result.sent} member(s)`, data: result });
    } catch (err) { next(err); }
  },

  async getMyClubs(req, res, next) {
    try {
      const clubs = await clubService.getMyClubs(req.user.userId);
      res.json({ success: true, count: clubs.length, data: clubs });
    } catch (err) { next(err); }
  },
};
