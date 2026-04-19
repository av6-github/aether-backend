import { Router } from 'express';
import { timetableController } from './timetable.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireRoles, requireTimetableCoord } from '../middleware/rbac.middleware.js';
import { uploadTimetableSchema, approvalSchema } from '../validators/timetable.validator.js';

const router = Router();

// Upload Timetable - Requires Faculty + 'timetable_coord' subRole
router.post(
  '/',
  requireTimetableCoord,
  validate(uploadTimetableSchema),
  timetableController.upload
);

// HOD View pending timetables
router.get(
  '/pending',
  requireRoles('hod', 'superadmin'),
  timetableController.getPending
);

// HOD Approve/Reject Timetable
router.patch(
  '/:id/review',
  requireRoles('hod', 'superadmin'),
  validate(approvalSchema),
  timetableController.review
);

// Get My Timetable (Student or Faculty)
router.get(
  '/me',
  requireRoles('student', 'council', 'faculty'),
  timetableController.getMyTimetable
);

// Get Faculty's own submitted timetables with HOD feedback
router.get(
  '/my-submissions',
  requireRoles('faculty'),
  timetableController.getMySubmissions
);

// Get all approved timetables for the Dept (HOD/Dean)
router.get(
  '/department',
  requireRoles('hod', 'dean', 'superadmin'),
  timetableController.getDepartmentTimetables
);

// Get Next Class for Student
router.get(
  '/next-class',
  requireRoles('student', 'council'),
  timetableController.getNextClass
);

// Check Room Availability
router.get(
  '/rooms/:id/availability',
  requireRoles('student', 'faculty', 'hod', 'dean', 'council', 'superadmin'),
  timetableController.getRoomAvailability
);

// Get all rooms with current availability (for VacantRoomsScreen)
router.get(
  '/vacant',
  requireRoles('student', 'faculty', 'hod', 'dean', 'council', 'superadmin'),
  timetableController.getVacantRooms
);

export { router as timetableRouter };
