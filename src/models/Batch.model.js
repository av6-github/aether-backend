import mongoose, { Schema } from 'mongoose';

const BatchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    division: { type: String, required: true },
    academicYear: { type: String, required: true },
    // Up to ~20 students per batch
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

BatchSchema.index({ facultyId: 1 });
BatchSchema.index({ departmentId: 1, academicYear: 1 });

export const Batch = mongoose.model('Batch', BatchSchema);
