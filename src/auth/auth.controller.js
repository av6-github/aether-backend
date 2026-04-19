import { authService } from './auth.service.js';
import { User } from '../shared.js';

export const authController = {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshTokens(refreshToken);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async me(req, res, next) {
    try {
      const user = await User.findById(req.user.userId)
        .populate('departmentId', 'name code color');
      if (!user) { return res.status(404).json({ success: false, message: 'User not found' }); }
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async updateSubRole(req, res, next) {
    try {
      const result = await authService.updateSubRole(
        req.user.userId, req.user.role, req.body.userId, req.body.subRole
      );
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async registerPushToken(req, res, next) {
    try {
      await authService.registerPushToken(req.user.userId, req.body.token);
      res.json({ success: true, message: 'Push token registered' });
    } catch (err) { next(err); }
  },

  async listUsers(req, res, next) {
    try {
      const { role } = req.query;
      const filter = {};
      if (role) {
        if (role.includes(',')) {
          filter.role = { $in: role.split(',') };
        } else {
          filter.role = role;
        }
      }
      const users = await User.find(filter)
        .select('name email role departmentId enrollmentNo semester division')
        .populate('departmentId', 'name code')
        .limit(200)
        .sort({ name: 1 });
      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  },
};
