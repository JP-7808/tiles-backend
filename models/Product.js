import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  shortDescription: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  comparePrice: {
    type: Number,
    min: 0
  },
  costPerItem: {
    type: Number,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  images: [{
    url: String,
    public_id: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  specifications: {
    type: {
      size: {
        length: { type: Number, required: false },
        width: { type: Number, required: false },
        thickness: { type: Number, required: false },
        unit: { type: String, default: 'cm', required: false }
      },
      area: [{ type: String, required: false }],
      design: [{ type: String, required: false }],
      type: [{ type: String, required: false }],
      color: [{ type: String, required: false }],
      finish: [{ type: String, required: false }],
      brand: { type: String, required: false },
      material: { type: String, required: false },
      waterAbsorption: { type: String, required: false },
      frostResistance: { type: Boolean, required: false },
      slipResistance: { type: String, required: false },
      chemicalResistance: { type: String, required: false },
      recommendedUsage: [{ type: String, required: false }]
    },
    default: {} // Default to an empty object if no specifications are provided
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  sku: {
    type: String,
    unique: true,
    required: true
  },
  barcode: String,
  weight: {
    value: Number,
    unit: {
      type: String,
      default: 'kg'
    }
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  salesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
productSchema.index({ slug: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'specifications.brand': 1 });
productSchema.index({ 'specifications.color': 1 });
productSchema.index({ 'specifications.size.length': 1, 'specifications.size.width': 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;