import { Router } from 'express';
import { pluginController } from './plugin.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Any authenticated user can list plugins available for their role
router.get('/', pluginController.list);

// Any authenticated user: register a new plugin (goes into review implicitly)
router.post(
  '/',
  pluginController.register
);

// Superadmin: toggle a plugin's active status
router.patch(
  '/:slug/toggle',
  requireRoles('superadmin'),
  pluginController.toggle
);

// Any authenticated user: get a scoped launch token for a plugin
router.post('/:slug/token', pluginController.getLaunchToken);

export { router as pluginRouter };
