import { Router } from 'express';
import { chatController } from './chat.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Get chat inbox (all conversations)
router.get(
  '/inbox',
  requireRoles('student', 'faculty', 'hod', 'dean', 'council', 'superadmin'),
  chatController.myInbox
);

// Check if student can chat with a faculty
router.get(
  '/can-chat/:facultyId',
  requireRoles('student', 'council'),
  chatController.canChat
);

// --- Coordination Rooms (Faculty) ---
// IMPORTANT: These must be defined BEFORE /:roomId to avoid Express
// treating "coordination" as a roomId parameter.
router.post(
  '/coordination',
  requireRoles('faculty', 'hod', 'dean', 'superadmin'),
  chatController.createCoordinationRoom
);

router.get(
  '/coordination',
  requireRoles('faculty', 'hod', 'dean', 'superadmin'),
  chatController.getCoordinationRooms
);

router.post(
  '/coordination/:roomId/messages',
  requireRoles('faculty', 'hod', 'dean', 'superadmin'),
  chatController.sendCoordinationMessage
);

router.get(
  '/coordination/:roomId/messages',
  requireRoles('faculty', 'hod', 'dean', 'superadmin'),
  chatController.getCoordinationHistory
);

// Get chat history for a room (student or faculty) — MUST be after /coordination
router.get(
  '/:roomId',
  requireRoles('student', 'faculty', 'hod', 'dean', 'council', 'superadmin'),
  chatController.getHistory
);

// Send a message to a room — MUST be after /coordination
router.post(
  '/:roomId',
  requireRoles('student', 'faculty', 'hod', 'dean', 'council', 'superadmin'),
  chatController.sendMessage
);

export { router as chatRouter };
