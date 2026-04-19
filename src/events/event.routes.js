import { Router } from 'express';
import { eventController } from './event.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { createEventSchema, eventApprovalSchema } from '../validators/event.validator.js';

const router = Router();

const ALL_EVENT_ROLES = ['student', 'council', 'committee', 'hod', 'dean', 'superadmin'];

// Submit a new event request
router.post(
  '/',
  requireRoles('student', 'council', 'committee'),
  validate(createEventSchema),
  eventController.submitEvent
);

// Get all approved events (public calendar)
router.get('/', eventController.getAllEvents);

// Pending queue for reviewers
router.get(
  '/pending',
  requireRoles('council', 'hod', 'dean', 'superadmin', 'committee'),
  eventController.getPending
);

// My submitted requests (student/committee)
router.get(
  '/me',
  requireRoles('student', 'council', 'committee'),
  eventController.myRequests
);

// Council / HOD / Dean: history of events they personally reviewed
router.get(
  '/my-approvals',
  requireRoles('council', 'hod', 'dean', 'superadmin'),
  eventController.myApprovals
);

// Approve/Reject an event
router.patch(
  '/:id/review',
  requireRoles('council', 'hod', 'dean', 'superadmin'),
  validate(eventApprovalSchema),
  eventController.reviewEvent
);

// Full event detail with populated chain — for EventDetailScreen
// Owner (requester) or any reviewer role can access
router.get(
  '/:id/detail',
  requireRoles(...ALL_EVENT_ROLES),
  eventController.getEventById
);

// Download/generate the proposal PDF
router.get(
  '/:id/pdf',
  requireRoles(...ALL_EVENT_ROLES),
  eventController.getEventPdf
);

export { router as eventRouter };
