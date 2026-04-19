import { Router } from 'express';
import { batchController } from './batch.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// HOD creates a new batch and assigns a faculty
router.post(
  '/',
  requireRoles('hod', 'superadmin'),
  batchController.create
);

// Faculty sees all their own batches
router.get(
  '/my',
  requireRoles('faculty'),
  batchController.myBatches
);

// Student sees their batches
router.get(
  '/student',
  requireRoles('student'),
  batchController.studentBatches
);

// HOD lists all batches in their department
router.get(
  '/department',
  requireRoles('hod', 'superadmin'),
  batchController.listByDepartment
);

// Faculty or HOD views a single batch
router.get(
  '/:id',
  requireRoles('faculty', 'hod', 'superadmin'),
  batchController.getById
);

// HOD updates the student list of a batch
router.patch(
  '/:id/students',
  requireRoles('hod', 'superadmin'),
  batchController.updateStudents
);

// Faculty sends a notice to their batch
router.post(
  '/:id/notice',
  requireRoles('faculty'),
  batchController.sendBatchNotice
);

export { router as batchRouter };
