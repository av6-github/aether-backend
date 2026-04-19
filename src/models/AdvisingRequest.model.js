import mongoose, { Schema } from 'mongoose';

const AdvisingRequestSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'acknowledged', 'done', 'rejected'], default: 'pending' },
    facultyReply: { type: String, default: '' },
  },
  { timestamps: true }
);

AdvisingRequestSchema.index({ studentId: 1, createdAt: -1 });
AdvisingRequestSchema.index({ facultyId: 1, status: 1 });

export const AdvisingRequest = mongoose.model('AdvisingRequest', AdvisingRequestSchema);
