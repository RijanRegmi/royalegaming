import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  username: { type: String, unique: true, sparse: true, index: true }, // unique slug for admins (e.g. admin1)
  phone: { type: String },
  password: { type: String },
  googleId: { type: String },
  role: { type: String, enum: ['super_admin', 'admin', 'user'], default: 'user' },
  avatar: { type: String },
  resetCode: { type: String },
  resetCodeExpires: { type: Date },
  fcmToken: { type: String, default: null },
  linkedAdmins: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }], // list of admins linked to this player
  isFrozen: { type: Boolean, default: false },
}, { timestamps: true });

const User = models.User || model('User', UserSchema);
export default User;
