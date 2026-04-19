import { Router } from 'express';
import { leaveController } from './leave.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Faculty applies for leave
router.post(
  '/',
  requireRoles('faculty'),
  leaveController.apply
);

// Faculty views their own leave history
router.get(
  '/my',
  requireRoles('faculty'),
  leaveController.getMyLeaves
);

// HOD views all pending leaves in their department
router.get(
  '/pending',
  requireRoles('hod', 'superadmin'),
  leaveController.getPending
);

// HOD or Dean views all leaves for their department (with optional ?status= filter)
router.get(
  '/department',
  requireRoles('hod', 'dean', 'superadmin'),
  leaveController.getDeptLeaves
);

// HOD approves or rejects a leave request
router.patch(
  '/:id/review',
  requireRoles('hod', 'superadmin'),
  leaveController.review
);

// Student applies for leave (directed to faculty)
router.post(
  '/student',
  requireRoles('student', 'council'),
  leaveController.studentApply
);

// Student views their own leave history
router.get(
  '/student/my',
  requireRoles('student', 'council'),
  leaveController.studentMyLeaves
);

// Faculty views incoming student leaves
router.get(
  '/student/incoming',
  requireRoles('faculty', 'hod', 'superadmin'),
  leaveController.studentIncoming
);

// Faculty approves or rejects a student leave
router.patch(
  '/student/:id/review',
  requireRoles('faculty', 'hod', 'superadmin'),
  leaveController.studentReview
);

// Get Faculty Leave PDF
router.get(
  '/faculty/:id/pdf',
  leaveController.getFacultyLeavePdf
);

// Get Student Leave PDF
router.get(
  '/student/:id/pdf',
  leaveController.getStudentLeavePdf
);

export { router as leaveRouter };
