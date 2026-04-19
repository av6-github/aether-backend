import { paymentService } from './payment.service.js';

export const paymentController = {
  // GET /api/payments/dues — student's unpaid dues
  async myDues(req, res, next) {
    try {
      const dues = await paymentService.getStudentDues(req.user.userId);
      res.json({ success: true, count: dues.length, data: dues });
    } catch (err) { next(err); }
  },

  // GET /api/payments/dues/history — all dues including paid/waived
  async dueHistory(req, res, next) {
    try {
      const dues = await paymentService.getDueHistory(req.user.userId);
      res.json({ success: true, data: dues });
    } catch (err) { next(err); }
  },

  // GET /api/payments/outstanding — total outstanding amount
  async outstanding(req, res, next) {
    try {
      const data = await paymentService.getTotalOutstanding(req.user.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // POST /api/payments/dues — raise a due (faculty/hod/dean only)
  async raiseDue(req, res, next) {
    try {
      const due = await paymentService.raiseDue(req.body, req.user.userId);
      res.status(201).json({ success: true, data: due });
    } catch (err) { next(err); }
  },

  // POST /api/payments/dues/:id/order — create Razorpay order
  async createOrder(req, res, next) {
    try {
      const order = await paymentService.createOrder(req.params.id, req.user.userId);
      res.json({ success: true, data: order });
    } catch (err) { next(err); }
  },

  // POST /api/payments/dues/:id/verify — verify payment & settle
  async verifyPayment(req, res, next) {
    try {
      const due = await paymentService.verifyAndSettle(
        req.params.id,
        req.user.userId,
        req.body
      );
      res.json({ success: true, message: 'Payment verified and due settled', data: due });
    } catch (err) { next(err); }
  },

  // PATCH /api/payments/dues/:id/waive — waive a due (hod/dean only)
  async waiveDue(req, res, next) {
    try {
      const due = await paymentService.waiveDue(req.params.id, req.user.userId);
      res.json({ success: true, data: due });
    } catch (err) { next(err); }
  },

  // GET /api/payments/students/search — search students
  async searchStudents(req, res, next) {
    try {
      const students = await paymentService.searchStudents(req.query.q);
      res.json({ success: true, data: students });
    } catch (err) { next(err); }
  },
};
