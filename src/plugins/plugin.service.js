import { Plugin } from '../shared.js';
import jwt from 'jsonwebtoken';

const PLUGIN_JWT_SECRET = process.env.PLUGIN_JWT_SECRET || 'plugin_sandbox_secret_change_in_prod';
const PLUGIN_TOKEN_TTL = '15m';

class PluginService {
  /**
   * Return all active plugins whose allowedRoles include the caller's role.
   */
  async listActive(role) {
    return Plugin.find({
      isActive: true,
      allowedRoles: role,
    }).sort({ name: 1 });
  }

  /**
   * Register a new plugin (superadmin only).
   */
  async register(data, adminId) {
    const plugin = await Plugin.create({
      ...data,
      verifiedBy: adminId,
      isActive: true,
    });
    return plugin;
  }

  /**
   * Toggle a plugin's active state.
   */
  async toggle(slug, isActive) {
    const plugin = await Plugin.findOneAndUpdate(
      { slug },
      { isActive },
      { new: true }
    );
    if (!plugin) throw { status: 404, message: `Plugin '${slug}' not found` };
    return plugin;
  }

  /**
   * Generate a short-lived, plugin-scoped JWT for a user launching a mini-app.
   * The mini-app uses this token to authenticate calls to /api/plugin-bridge/*.
   */
  generatePluginToken(user, plugin) {
    const payload = {
      sub: user.userId,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      plugin: plugin.slug,
      scopes: plugin.requiresScopes,
    };
    return jwt.sign(payload, PLUGIN_JWT_SECRET, { expiresIn: PLUGIN_TOKEN_TTL });
  }

  async getBySlug(slug) {
    const plugin = await Plugin.findOne({ slug, isActive: true });
    if (!plugin) throw { status: 404, message: `Plugin '${slug}' not found or inactive` };
    return plugin;
  }
}

export const pluginService = new PluginService();
export { PLUGIN_JWT_SECRET };
