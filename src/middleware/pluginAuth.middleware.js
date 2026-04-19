import jwt from 'jsonwebtoken';
import { PLUGIN_JWT_SECRET } from '../plugins/plugin.service.js';

/**
 * Middleware that validates plugin-scoped JWTs for the plugin bridge.
 * Attaches decoded payload to req.pluginUser.
 * Completely separate from the main authMiddleware — uses PLUGIN_JWT_SECRET.
 */
export function pluginAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No plugin token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, PLUGIN_JWT_SECRET);
    // Ensure it is a plugin token (must have plugin field)
    if (!payload.plugin) {
      return res.status(401).json({ success: false, message: 'Invalid plugin token' });
    }
    req.pluginUser = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Plugin token expired. Re-launch the app.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid plugin token' });
  }
}
