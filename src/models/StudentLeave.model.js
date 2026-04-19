import mongoose, { Schema } from 'mongoose';

const StudentLeaveSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    leaveType: { type: String, enum: ['medical', 'personal', 'family', 'other'], default: 'personal' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

StudentLeaveSchema.index({ studentId: 1, createdAt: -1 });
StudentLeaveSchema.index({ facultyId: 1, status: 1 });

// Real-time synchronization hook
StudentLeaveSchema.post('save', async function(doc) {
  try {
    const { pushToUser } = await import('../notifications/socket.server.js');
    pushToUser(doc.studentId.toString(), 'leave_status_changed', {
      leaveId: doc._id,
      status: doc.status,
      fromDate: doc.fromDate,
      toDate: doc.toDate
    });
  } catch (err) {
    console.error('[StudentLeave Hook Error]', err);
  }
});

export const StudentLeave = mongoose.model('StudentLeave', StudentLeaveSchema);
