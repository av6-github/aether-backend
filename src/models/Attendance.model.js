import mongoose, { Schema } from 'mongoose';

const AttendanceRecordSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  remarks: { type: String, default: '' },
}, { _id: true });

const AttendanceSchema = new Schema(
  {
    timetableSlotRef: {
      timetableId: { type: Schema.Types.ObjectId, ref: 'Timetable' },
      day: String,
      startTime: String,
    },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    division: { type: String, required: true },
    date: { type: Date, required: true },
    records: [AttendanceRecordSchema],
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate sessions
AttendanceSchema.index(
  { subjectId: 1, facultyId: 1, date: 1, division: 1 },
  { unique: true }
);
AttendanceSchema.index({ departmentId: 1, date: 1 });
AttendanceSchema.index({ 'records.studentId': 1, subjectId: 1 });

// Real-time synchronization hook
AttendanceSchema.post('save', async function (doc) {
  try {
    const { pushToUser } = await import('../notifications/socket.server.js');
    doc.records.forEach(record => {
      pushToUser(record.studentId.toString(), 'attendance_updated', {
        attendanceId: doc._id,
        date: doc.date,
        subjectId: doc.subjectId,
        status: record.status
      });
    });
  } catch (err) {
    console.error('[Attendance Hook Error]', err);
  }
});

export const Attendance = mongoose.model('Attendance', AttendanceSchema);
