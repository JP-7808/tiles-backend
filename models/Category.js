import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, trim: true },
  image: { url: String, public_id: String },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  filters: [{ name: String, values: [String] }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

categorySchema.index({ slug: 1, isActive: 1 });

const Category = mongoose.model('Category', categorySchema);
export default Category;
