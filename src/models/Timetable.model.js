import mongoose, { Schema } from 'mongoose';

const TimetableSlotSchema = new Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  // lecture = 1 hour, lab = 2 hours
  slotType: { type: String, enum: ['lecture', 'lab'], default: 'lecture' },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
}, { _id: false });

const TimetableSchema = new Schema(
  {
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    division: { type: String, required: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    academicYear: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    hodComment: { type: String },
    slots: [TimetableSlotSchema],
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

TimetableSchema.index({ departmentId: 1, division: 1, semester: 1, academicYear: 1 });
TimetableSchema.index({ status: 1 });
TimetableSchema.index({ uploadedBy: 1 });

export const Timetable = mongoose.model('Timetable', TimetableSchema);
