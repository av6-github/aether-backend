import { pluginService } from './plugin.service.js';
import { User } from '../shared.js';

export const pluginController = {
  async list(req, res, next) {
    try {
      const plugins = await pluginService.listActive(req.user.role);
      res.json({ success: true, count: plugins.length, data: plugins });
    } catch (err) { next(err); }
  },

  async register(req, res, next) {
    try {
      const plugin = await pluginService.register(req.body, req.user.userId);
      res.status(201).json({ success: true, data: plugin });
    } catch (err) { next(err); }
  },

  async toggle(req, res, next) {
    try {
      const { isActive } = req.body;
      const plugin = await pluginService.toggle(req.params.slug, isActive);
      res.json({ success: true, data: plugin });
    } catch (err) { next(err); }
  },

  async getLaunchToken(req, res, next) {
    try {
      const plugin = await pluginService.getBySlug(req.params.slug);
      // Verify caller's role is permitted
      if (!plugin.allowedRoles.includes(req.user.role) && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Your role cannot access this plugin' });
      }
      // Fetch user's name since it's not in the access token payload
      const userDoc = await User.findById(req.user.userId).select('name');
      const enrichedUser = { ...req.user, name: userDoc?.name || 'Student' };
      
      const token = pluginService.generatePluginToken(enrichedUser, plugin);
      res.json({
        success: true,
        data: {
          token,
          plugin: {
            slug: plugin.slug,
            name: plugin.name,
            appUrl: plugin.appUrl,
          }
        }
      });
    } catch (err) { next(err); }
  },
};
