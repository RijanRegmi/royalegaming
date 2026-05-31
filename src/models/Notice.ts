import mongoose, { Schema, model, models } from 'mongoose';

export interface INotice {
  title: string;
  content: string;
  type: 'system' | 'global' | 'admin_warning' | 'super_admin_broadcast';
  targetUserId?: mongoose.Types.ObjectId;
  targetRole?: 'admin' | 'user' | 'all';
  createdBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['system', 'global', 'admin_warning', 'super_admin_broadcast'], 
    default: 'global' 
  },
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  targetRole: { type: String, enum: ['admin', 'user', 'all'], default: 'all', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Notice = models.Notice || model<INotice>('Notice', NoticeSchema);
export default Notice;
