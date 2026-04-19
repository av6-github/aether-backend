import { Router } from 'express';
import { eventController } from './event.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { createEventSchema, eventApprovalSchema } from '../validators/event.validator.js';

const router = Router();

// Any authenticated student, council, or committee member can request an event
router.post(
  '/',
  requireRoles('student', 'council', 'committee'),
  validate(createEventSchema),
  eventController.submitEvent
);

// Get all events (public to authenticated users)
router.get(
  '/',
  eventController.getAllEvents
);

// Admins get their pending queue
router.get(
  '/pending',
  requireRoles('council', 'hod', 'dean', 'superadmin', 'committee'),
  eventController.getPending
);

// Admins reviewing an event (Approve/Reject)
router.patch(
  '/:id/review',
  requireRoles('council', 'hod', 'dean', 'superadmin'),
  validate(eventApprovalSchema),
  eventController.reviewEvent
);

// Filter requests raised strictly by the active student/committee
router.get(
  '/me',
  requireRoles('student', 'council', 'committee'),
  eventController.myRequests
);

// Get the extended PDF form for any event
router.get(
  '/:id/pdf',
  eventController.getEventPdf
);

export { router as eventRouter };
