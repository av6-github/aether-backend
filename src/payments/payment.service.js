import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Due, User } from '../shared.js';
import { notificationService } from '../notifications/notification.service.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

class PaymentService {
  /**
   * Get all unpaid dues for a student.
   */
  async getStudentDues(studentId) {
    return Due.find({ studentId, status: 'unpaid' })
      .populate('issuedBy', 'name role')
      .sort({ dueDate: 1 });
  }

  /**
   * Get all dues for a student regardless of status (for history).
   */
  async getDueHistory(studentId) {
    return Due.find({ studentId })
      .populate('issuedBy', 'name role')
      .sort({ createdAt: -1 });
  }

  /**
   * Raise a new due for a student (faculty/admin only).
   */
  async raiseDue(data, issuedBy) {
    return Due.create({
      ...data,
      issuedBy,
      status: 'unpaid',
    });
  }

  /**
   * Waive a due (HOD/Dean only).
   */
  async waiveDue(dueId, waivedBy) {
    const due = await Due.findById(dueId);
    if (!due) throw { status: 404, message: 'Due not found' };
    if (due.status !== 'unpaid') throw { status: 400, message: 'Due is already settled' };
    due.status = 'waived';
    due.waivedBy = waivedBy;
    await due.save();
    return due;
  }

  /**
   * Create a Razorpay order for a specific due.
   * Returns the order object to pass to the Razorpay SDK on the client.
   */
  async createOrder(dueId, studentId) {
    const due = await Due.findOne({ _id: dueId, studentId });
    if (!due) throw { status: 404, message: 'Due not found' };
    if (due.status !== 'unpaid') throw { status: 400, message: 'Due is already settled' };

    const order = await razorpay.orders.create({
      amount: due.amount,       // in paise
      currency: 'INR',
      receipt: `due_${dueId}`,
      notes: {
        dueId: dueId.toString(),
        studentId: studentId.toString(),
        type: due.type,
        description: due.description,
      },
    });

    due.razorpayOrderId = order.id;
    await due.save();

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    };
  }

  /**
   * Verify Razorpay signature and mark due as paid.
   * Uses HMAC-SHA256: signature = HMAC_SHA256(orderId + "|" + paymentId, key_secret)
   */
  async verifyAndSettle(dueId, studentId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const due = await Due.findOne({ _id: dueId, studentId });
    if (!due) throw { status: 404, message: 'Due not found' };
    if (due.status === 'paid') throw { status: 400, message: 'Already paid' };

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      if (process.env.NODE_ENV === 'development' && razorpaySignature === 'EXPO_GO_MOCK_SIGNATURE') {
        console.log('[Dev] Bypassing Razorpay signature check for Expo Go');
      } else {
        throw { status: 400, message: 'Payment verification failed — invalid signature' };
      }
    }

    due.status = 'paid';
    due.razorpayPaymentId = razorpayPaymentId;
    due.razorpaySignature = razorpaySignature;
    due.paidAt = new Date();
    await due.save();

    // Send receipt notification
    const amountRupees = (due.amount / 100).toFixed(2);
    notificationService.send(due.studentId, {
      title: '✅ Payment Successful',
      body: `₹${amountRupees} paid for ${due.description}. Payment ID: ${razorpayPaymentId}`,
      type: 'payment_receipt',
      metadata: { dueId: due._id, paymentId: razorpayPaymentId },
    }).catch(console.error);

    return due;
  }

  /**
   * Get total outstanding amount for a student (in rupees).
   */
  async getTotalOutstanding(studentId) {
    const dues = await Due.find({ studentId, status: 'unpaid' });
    const totalPaise = dues.reduce((sum, d) => sum + d.amount, 0);
    return {
      totalRupees: (totalPaise / 100).toFixed(2),
      count: dues.length,
    };
  }

  /**
   * Search for students by name or enrollment number.
   * Limited to student role.
   */
  async searchStudents(query) {
    if (!query) return [];
    const regex = new RegExp(query, 'i');
    return User.find({
      role: 'student',
      $or: [
        { name: regex },
        { enrollmentNo: regex }
      ]
    })
    .select('name email enrollmentNo departmentId semester division')
    .populate('departmentId', 'name')
    .limit(10);
  }
}

export const paymentService = new PaymentService();
