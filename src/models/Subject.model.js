import mongoose, { Schema } from 'mongoose';

const SyllabusTopicSchema = new Schema({
  name: { type: String, required: true, trim: true },
  unit: { type: Number, required: true },
}, { _id: true });

const SubjectSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    credits: { type: Number, required: true, min: 1, max: 6 },
    semester: { type: Number, required: true, min: 1, max: 8 },
    syllabusPDF: { type: String },
    // Canonical list of topics for this subject — used to auto-init syllabus trackers
    syllabusTopics: [SyllabusTopicSchema],
  },
  { timestamps: true }
);

SubjectSchema.index({ departmentId: 1, semester: 1 });

export const Subject = mongoose.model('Subject', SubjectSchema);
