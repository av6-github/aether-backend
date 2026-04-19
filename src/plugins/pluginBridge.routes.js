import { Router } from 'express';
import { pluginAuthMiddleware } from '../middleware/pluginAuth.middleware.js';
import { notificationService } from '../notifications/notification.service.js';
import { User } from '../shared.js';

const router = Router();

// All plugin-bridge routes require a valid plugin-scoped token
router.use(pluginAuthMiddleware);

/**
 * GET /api/plugin-bridge/me
 * Returns limited user profile info (what the plugin is allowed to see).
 */
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.pluginUser.sub)
      .select('name email role semester division departmentId enrollmentNo');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

/**
 * POST /api/plugin-bridge/notify
 * Allows a plugin to push a notification to the authenticated user.
 * Requires scope: notifications.write
 */
router.post('/notify', async (req, res, next) => {
  try {
    const { scopes, sub: userId, plugin } = req.pluginUser;
    if (!scopes?.includes('notifications.write')) {
      return res.status(403).json({ success: false, message: 'Plugin does not have notifications.write scope' });
    }
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'title and body are required' });

    await notificationService.send(userId, {
      title: `[${plugin}] ${title}`,
      body,
      type: 'plugin_notification',
      metadata: { plugin },
    });
    res.json({ success: true, message: 'Notification sent' });
  } catch (err) { next(err); }
});

export { router as pluginBridgeRouter };
