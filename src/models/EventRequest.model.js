import mongoose, { Schema } from 'mongoose';

const ApprovalStepSchema = new Schema({
  role: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  comment: { type: String },
  timestamp: { type: Date },
}, { _id: false });

const EventRequestSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    venue: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    expectedAttendance: { type: Number, default: 0 },
    templateType: { type: String, enum: ['hackathon', 'case_study', 'plain'], default: 'plain' },
    resources: [{ type: String }],
    conflictChecked: { type: Boolean, default: false },
    conflictResult: { type: Schema.Types.Mixed },
    chain: [ApprovalStepSchema],
    currentStage: {
      type: String,
      enum: ['conflict_check', 'council', 'hod', 'dean', 'approved', 'rejected'],
      default: 'conflict_check'
    },
    approvalDocURL: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  },
  { timestamps: true }
);

EventRequestSchema.index({ currentStage: 1 });
EventRequestSchema.index({ requestedBy: 1 });
EventRequestSchema.index({ startTime: 1, endTime: 1 });

export const EventRequest = mongoose.model('EventRequest', EventRequestSchema);
