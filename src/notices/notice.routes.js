import { Router } from 'express';
import { noticeController } from './notice.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Publish a notice — Faculty, HOD, or Dean only
router.post(
  '/',
  requireRoles('faculty', 'hod', 'dean', 'superadmin'),
  noticeController.publish
);

// Get notices relevant to me (scoped by dept/division/semester)
router.get(
  '/',
  requireRoles('student', 'faculty', 'hod', 'dean', 'council', 'superadmin'),
  noticeController.getNotices
);

// Get notices I personally published (Faculty/HOD)
router.get(
  '/mine',
  requireRoles('faculty', 'hod', 'dean', 'superadmin'),
  noticeController.getMyNotices
);

// Soft-delete a notice (publisher only)
router.delete(
  '/:id',
  requireRoles('faculty', 'hod', 'dean', 'superadmin'),
  noticeController.deleteNotice
);

export { router as noticeRouter };
