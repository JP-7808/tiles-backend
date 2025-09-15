import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, trim: true },
  discountType: { type: String, required: true, enum: ['percentage', 'fixed'] },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderValue: { type: Number, min: 0 },
  maxDiscount: { type: Number, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  userLimit: { type: Number, min: 0 },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
