import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  planId: string; // "1", "6", "12"
  name: string;
  subtitle: string;
  pricePerMonth: number;
  months: number;
  features: string[];
  isPopular: boolean;
}

const SubscriptionPlanSchema: Schema = new Schema({
  planId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subtitle: { type: String, required: true },
  pricePerMonth: { type: Number, required: true },
  months: { type: Number, required: true },
  features: { type: [String], default: [] },
  isPopular: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.SubscriptionPlan || mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
