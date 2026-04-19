import { Router } from 'express';
import { notificationController } from './notification.controller.js';

const router = Router();

// Fetch all notifications for logged-in user
router.get('/', notificationController.getAll);

// Fetch only unread count + items
router.get('/unread', notificationController.getUnread);

// Mark single notification as read
router.patch('/:id/read', notificationController.markRead);

// Mark all as read in one shot
router.patch('/read-all', notificationController.markAllRead);

export { router as notificationRouter };
