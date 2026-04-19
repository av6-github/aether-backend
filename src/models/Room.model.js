import mongoose, { Schema } from 'mongoose';

const RoomSchema = new Schema({
  name: { type: String, required: true, unique: true },
  building: { type: String, required: true },
  floor: { type: Number, required: true },
  capacity: { type: Number, required: true },
  type: {
    type: String,
    enum: ['classroom', 'lab', 'seminar_hall', 'auditorium'],
    default: 'classroom'
  },
  floorPlanCoordinates: {
    x: { type: Number },
    y: { type: Number }
  }
});

RoomSchema.index({ building: 1, floor: 1 });

export const Room = mongoose.model('Room', RoomSchema);
