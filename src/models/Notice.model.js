import mongoose, { Schema } from 'mongoose';

const NoticeSchema = new Schema({
  // Who published this notice
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // Scoping — which department, division, semester this notice targets
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  targetDivisions: [{ type: String }],   // e.g. ['A', 'B'] — empty means all divisions
  targetSemesters: [{ type: Number }],   // e.g. [3, 5] — empty means all semesters

  // Content
  title: { type: String, required: true, trim: true, maxLength: 150 },
  body:  { type: String, required: true, trim: true, maxLength: 5000 },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },

  // Optional: notice targeted to a specific faculty batch
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },

  // Expiry — after this date the notice is no longer shown by default
  expiresAt: { type: Date },

  // Soft delete
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

NoticeSchema.index({ departmentId: 1, isActive: 1, createdAt: -1 });

export const Notice = mongoose.model('Notice', NoticeSchema);
