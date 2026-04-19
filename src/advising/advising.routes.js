import { Router } from 'express';
import { advisingController } from './advising.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Create a new advising note — Faculty only
router.post(
  '/',
  requireRoles('faculty', 'hod', 'superadmin'),
  advisingController.createNote
);

// Create batch advising note
router.post(
  '/batch',
  requireRoles('faculty', 'hod', 'superadmin'),
  advisingController.createBatchNote
);

// Get all notes this faculty member has written
router.get(
  '/my-notes',
  requireRoles('faculty', 'hod', 'superadmin'),
  advisingController.getAllMyNotes
);

// Get pending follow-ups for this faculty member
router.get(
  '/follow-ups',
  requireRoles('faculty', 'hod', 'superadmin'),
  advisingController.getPendingFollowUps
);

// Mark a specific follow-up note as done
router.patch(
  '/:noteId/follow-up-done',
  requireRoles('faculty', 'hod', 'superadmin'),
  advisingController.markFollowUpDone
);

// Get all notes for a specific student (faculty author's view)
router.get(
  '/student/:studentId',
  requireRoles('faculty', 'hod', 'superadmin'),
  advisingController.getNotesForStudent
);

// Student can view notes the faculty explicitly shared with them
router.get(
  '/shared-with-me',
  requireRoles('student'),
  advisingController.getMySharedNotes
);

// Student submits an advising request to a faculty
router.post(
  '/request',
  requireRoles('student'),
  advisingController.createRequest
);

// Student views their own request history
router.get(
  '/my-requests',
  requireRoles('student'),
  advisingController.getMyRequests
);

// Faculty views incoming advising requests
router.get(
  '/incoming-requests',
  requireRoles('faculty', 'hod', 'superadmin'),
  advisingController.getIncomingRequests
);

// Faculty acknowledges / updates a request
router.patch(
  '/request/:requestId',
  requireRoles('faculty', 'hod', 'superadmin'),
  advisingController.updateRequest
);

export { router as advisingRouter };
