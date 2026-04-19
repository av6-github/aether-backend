import mongoose, { Schema } from 'mongoose';

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    hodId: { type: Schema.Types.ObjectId, ref: 'User' },
    facultyIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    color: { type: String, default: '#3b82f6' },
  },
  { timestamps: true }
);



export const Department = mongoose.model('Department', DepartmentSchema);
