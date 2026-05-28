import mongoose, { Schema, model, models } from 'mongoose';

export interface IPayment {
  adminId: mongoose.Types.ObjectId;
  name: string;
  qrImage: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  qrImage: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Payment = models.Payment || model<IPayment>('Payment', PaymentSchema);
export default Payment;
