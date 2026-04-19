import { Router } from 'express';
import { chatController } from './chat.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

const ALL_ROLES = ['student', 'faculty', 'hod', 'dean', 'council', 'committee', 'superadmin'];
const STAFF_ROLES = ['faculty', 'hod', 'dean', 'superadmin'];

// ── Inbox ──────────────────────────────────────────────────────────────────
// Get all 1-1 conversations (inbox view)
router.get('/inbox', requireRoles(...ALL_ROLES), chatController.myInbox);

// ── Room resolution ────────────────────────────────────────────────────────
// Get or derive the roomId between the caller and another user.
// Faculty uses this to open a chat with a student; student uses it to open their thread.
router.get('/room/:otherId', requireRoles(...ALL_ROLES), chatController.getOrCreateRoom);

// ── Can-chat check ─────────────────────────────────────────────────────────
// Check if student is allowed to message a faculty member
router.get('/can-chat/:facultyId', requireRoles('student', 'council'), chatController.canChat);

// ── Coordination Rooms (Faculty group channels) ────────────────────────────
// IMPORTANT: /coordination routes MUST be declared BEFORE /:roomId
// so Express doesn't treat "coordination" as a roomId param.

router.post(
  '/coordination',
  requireRoles(...STAFF_ROLES),
  chatController.createCoordinationRoom
);

router.get(
  '/coordination',
  requireRoles(...STAFF_ROLES),
  chatController.getCoordinationRooms
);

router.post(
  '/coordination/:roomId/messages',
  requireRoles(...STAFF_ROLES),
  chatController.sendCoordinationMessage
);

router.get(
  '/coordination/:roomId/messages',
  requireRoles(...STAFF_ROLES),
  chatController.getCoordinationHistory
);

// ── 1-1 Chat ───────────────────────────────────────────────────────────────
// Get chat history for a room — MUST be after /coordination and /room
router.get('/:roomId', requireRoles(...ALL_ROLES), chatController.getHistory);

// Send a message to a room — MUST be after /coordination
router.post('/:roomId', requireRoles(...ALL_ROLES), chatController.sendMessage);

export { router as chatRouter };
