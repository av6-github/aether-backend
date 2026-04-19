import { Router } from 'express';
import { timetableRouter } from '../timetable/timetable.routes.js';
import { attendanceRouter } from '../attendance/attendance.routes.js';
import { syllabusRouter } from '../syllabus/syllabus.routes.js';
import { eventRouter } from '../events/event.routes.js';
import { issueRouter } from '../issues/issue.routes.js';
import { notificationRouter } from '../notifications/notification.routes.js';
import { chatbotRouter } from '../chatbot/chatbot.routes.js';
import { analyticsRouter } from '../analytics/analytics.routes.js';
import { noticeRouter } from '../notices/notice.routes.js';
import { advisingRouter } from '../advising/advising.routes.js';
import { leaveRouter } from '../leave/leave.routes.js';
import { clubRouter } from '../clubs/club.routes.js';
import { batchRouter } from '../batch/batch.routes.js';
import { chatRouter } from '../chat/chat.routes.js';
import { pluginRouter } from '../plugins/plugin.routes.js';
import { paymentRouter } from '../payments/payment.routes.js';

const router = Router();

// Protected API routes
router.use('/timetable', timetableRouter);
router.use('/attendance', attendanceRouter);
router.use('/syllabus', syllabusRouter);
router.use('/events', eventRouter);
router.use('/issues', issueRouter);
router.use('/notifications', notificationRouter);
router.use('/chatbot', chatbotRouter);
router.use('/analytics', analyticsRouter);
router.use('/notices', noticeRouter);
router.use('/advising', advisingRouter);
router.use('/leave', leaveRouter);
router.use('/clubs', clubRouter);
router.use('/batches', batchRouter);
router.use('/chat', chatRouter);
router.use('/plugins', pluginRouter);
router.use('/payments', paymentRouter);

export { router as apiRouter };
