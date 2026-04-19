import { Router } from 'express';
import { paymentController } from './payment.controller.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Student: view unpaid dues
router.get(
  '/dues',
  requireRoles('student', 'council'),
  paymentController.myDues
);

// Student: view full payment history
router.get(
  '/dues/history',
  requireRoles('student', 'council'),
  paymentController.dueHistory
);

// Student: get total outstanding balance
router.get(
  '/outstanding',
  requireRoles('student', 'council'),
  paymentController.outstanding
);

// Faculty/HOD/Dean: search students to issue dues
router.get(
  '/students/search',
  requireRoles('faculty', 'hod', 'dean', 'superadmin'),
  paymentController.searchStudents
);

// Faculty/HOD/Dean: raise a new due for a student
router.post(
  '/dues',
  requireRoles('faculty', 'hod', 'dean', 'superadmin'),
  paymentController.raiseDue
);

// Student: create a Razorpay order for a specific due
router.post(
  '/dues/:id/order',
  requireRoles('student', 'council'),
  paymentController.createOrder
);

// Student: verify Razorpay payment and settle the due
router.post(
  '/dues/:id/verify',
  requireRoles('student', 'council'),
  paymentController.verifyPayment
);

// HOD/Dean: waive a due
router.patch(
  '/dues/:id/waive',
  requireRoles('hod', 'dean', 'superadmin'),
  paymentController.waiveDue
);

export { router as paymentRouter };
