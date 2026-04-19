import mongoose, { Schema } from 'mongoose';

const LeaveRequestSchema = new Schema({
  // Who is applying
  facultyId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },

  // Leave details
  leaveType: {
    type: String,
    enum: ['casual', 'medical', 'earned', 'duty', 'maternity', 'paternity', 'unpaid'],
    required: true
  },
  fromDate:   { type: Date, required: true },
  toDate:     { type: Date, required: true },
  reason:     { type: String, required: true, trim: true, maxLength: 1000 },
  totalDays:  { type: Number }, // computed on creation

  // Approval state
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // HOD decision
  hodAction: {
    hodId:     { type: Schema.Types.ObjectId, ref: 'User' },
    status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    comment:   { type: String },
    decidedAt: { type: Date }
  },

  // Substitute faculty arrangement (optional)
  substituteId: { type: Schema.Types.ObjectId, ref: 'User' },
  substituteNote: { type: String },

  // Supporting document reference (for medical etc.)
  supportingDocNote: { type: String },
}, { timestamps: true });

// Compute totalDays automatically before save
LeaveRequestSchema.pre('save', function (next) {
  if (this.fromDate && this.toDate) {
    const diffMs = this.toDate.getTime() - this.fromDate.getTime();
    this.totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
  }
  next();
});

LeaveRequestSchema.index({ facultyId: 1, fromDate: -1 });
LeaveRequestSchema.index({ departmentId: 1, status: 1 });

export const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);
