import mongoose, { Schema } from 'mongoose';

const TopicSchema = new Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  completedAt: { type: Date },
  notes: { type: String },
});

const SyllabusProgressSchema = new Schema(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true },
    topics: [TopicSchema],
    completionPercent: { type: Number, default: 0, min: 0, max: 100 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Auto-compute completionPercent before save
SyllabusProgressSchema.pre('save', function(next) {
  if (this.topics.length > 0) {
    const done = this.topics.filter(t => t.status === 'done').length;
    this.completionPercent = Math.round((done / this.topics.length) * 100);
  }
  this.lastUpdated = new Date();
  next();
});

SyllabusProgressSchema.index({ subjectId: 1, facultyId: 1, academicYear: 1 }, { unique: true });
SyllabusProgressSchema.index({ departmentId: 1, academicYear: 1 });

// Real-time synchronization hook — push to all users in the department
SyllabusProgressSchema.post('save', async function(doc) {
  try {
    const { pushToDept } = await import('../notifications/socket.server.js');
    // Emit to the entire department room so all students and faculty see the update
    pushToDept(doc.departmentId.toString(), 'syllabus:updated', {
      trackerId:         doc._id,
      subjectId:         doc.subjectId,
      completionPercent: doc.completionPercent,
      lastUpdated:       doc.lastUpdated,
    });
  } catch (err) {
    console.error('[Syllabus Hook Error]', err);
  }
});

export const SyllabusProgress = mongoose.model('SyllabusProgress', SyllabusProgressSchema);
