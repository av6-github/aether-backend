import mongoose, { Schema } from 'mongoose';

const CoordinationRoomSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' } // Optional association
  },
  { timestamps: true }
);

CoordinationRoomSchema.index({ members: 1 });

export const CoordinationRoom = mongoose.model('CoordinationRoom', CoordinationRoomSchema);
