import mongoose, { Schema } from 'mongoose';

const DueSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['library', 'canteen', 'lab', 'other'],
      required: true
    },
    description: { type: String, required: true, trim: true },
    // Amount stored in paise (₹1 = 100 paise) for Razorpay compatibility
    amount: { type: Number, required: true, min: 100 },
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'waived'],
      default: 'unpaid',
      index: true
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    paidAt: { type: Date, default: null },
    waivedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

DueSchema.index({ studentId: 1, status: 1 });
DueSchema.index({ type: 1, status: 1 });

export const Due = mongoose.model('Due', DueSchema);
