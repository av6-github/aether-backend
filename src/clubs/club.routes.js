import { Router } from 'express';
import { clubController } from './club.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.get(
  '/',
  requireRoles('student', 'faculty', 'hod', 'dean', 'council', 'superadmin', 'committee'),
  clubController.list
);

router.get(
  '/my',
  requireRoles('student', 'faculty', 'council', 'superadmin'),
  clubController.getMyClubs
);

// President/Advisor/Committee: see pending join requests for all clubs they manage
router.get(
  '/pending-requests',
  requireRoles('student', 'faculty', 'council', 'superadmin', 'committee'),
  clubController.getPendingRequests
);

router.get(
  '/:id',
  requireRoles('student', 'faculty', 'hod', 'dean', 'council', 'superadmin', 'committee'),
  clubController.getById
);

// Council or Faculty creates a club
router.post(
  '/',
  requireRoles('council', 'faculty', 'hod'),
  clubController.create
);

// Any student/council member submits a join request
router.post(
  '/:id/request-join',
  requireRoles('student', 'council'),
  clubController.requestJoin
);

// President or Advisor reviews a join request
router.patch(
  '/:id/join-requests/:requestId/review',
  requireRoles('student', 'council', 'faculty', 'committee'),
  clubController.reviewJoinRequest
);

// Member leaves a club
router.post(
  '/:id/leave',
  requireRoles('student', 'council', 'faculty'),
  clubController.leave
);

// President or Advisor broadcasts an alert to all club members
router.post(
  '/:id/alert',
  requireRoles('student', 'council', 'faculty', 'committee'),
  clubController.sendAlert
);

export { router as clubRouter };
