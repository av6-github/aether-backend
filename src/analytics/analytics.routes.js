import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// HOD combined dashboard — one call for the entire dept overview
router.get('/hod/dashboard', requireRoles('hod', 'superadmin'), analyticsController.hodDashboard);

// Dean combined dashboard — college-wide
router.get('/dean/dashboard', requireRoles('dean', 'superadmin'), analyticsController.deanDashboard);

// Granular stats — accessible by both HOD and Dean
router.get('/attendance', requireRoles('hod', 'dean', 'superadmin'), analyticsController.attendanceStats);
router.get('/syllabus', requireRoles('hod', 'dean', 'superadmin'), analyticsController.syllabusStats);
router.get('/issues', requireRoles('hod', 'dean', 'superadmin'), analyticsController.issueStats);
router.get('/events', requireRoles('hod', 'dean', 'superadmin'), analyticsController.eventStats);

export { router as analyticsRouter };
