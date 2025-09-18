import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema({
  length: { type: Number, required: true },
  width: { type: Number, required: true },
  unit: { 
    type: String, 
    required: true,
    enum: ['feet', 'inches', 'cm', 'mm', 'meters']
  }
});

const productSpecificationSchema = new mongoose.Schema({
  actualSize: sizeSchema,
  filterSize: sizeSchema,
  materialType: { type: String, required: true, trim: true },
  finish: { type: String, trim: true },
  application: { type: String, trim: true },
  brand: { type: String, trim: true },
  quality: { type: String, trim: true },
  coverageArea: { 
    value: { type: Number },
    unit: { type: String, enum: ['sqft', 'sqm'] }
  },
  piecesPerBox: { type: Number, min: 1 },
  thickness: {
    value: { type: Number },
    unit: { type: String, enum: ['mm', 'cm', 'inches'] }
  },
  weight: {
    value: { type: Number },
    unit: { type: String, enum: ['kg', 'lbs'] }
  }
});

const productDetailSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  maintenance: { type: String, trim: true },
  disclaimer: { type: String, trim: true },
  features: [{ type: String, trim: true }],
  installation: { type: String, trim: true },
  warranty: {
    period: { type: Number },
    unit: { type: String, enum: ['months', 'years'] },
    details: { type: String, trim: true }
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  shortDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  // Size information
  sizes: [sizeSchema],
  
  // Surface finish
  surfaceFinish: {
    type: String,
    required: true,
    trim: true,
    enum: ['matt', 'glossy', 'rustic', 'polished', 'textured', 'semi-gloss', 'matte', 'high-gloss']
  },
  
  // Ratings and reviews
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },
  
  // Room types
  roomTypes: [{
    type: String,
    enum: ['bathroom', 'kitchen', 'living-room', 'bedroom', 'dining-room', 'outdoor', 'wall', 'floor', 'ceiling', 'facade']
  }],
  
  // Applications
  applications: [{
    type: String,
    enum: ['flooring', 'wall-cladding', 'countertops', 'backsplash', 'shower-area', 'pool-side', 'patio', 'pathway']
  }],
  
  // Categories
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  
  // Finish types
  finishes: [{
    type: String,
    trim: true
  }],
  
  // Filter sizes
  filterSizes: [{
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
  }],
  
  // Colors
  colors: [{
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    hex: { type: String, trim: true },
    image: { url: String, public_id: String }
  }],
  
  // Price information
  pricing: {
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    salePrice: {
      type: Number,
      min: 0
    },
    costPrice: {
      type: Number,
      min: 0
    },
    priceUnit: {
      type: String,
      enum: ['piece', 'box', 'sqft', 'sqm'],
      default: 'piece'
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Price range for filtering
  priceRange: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 }
  },
  
  // Product specifications
  specifications: productSpecificationSchema,
  
  // Product details
  details: productDetailSchema,
  
  // Images
  images: [{
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    color: { type: String, trim: true }
  }],
  
  // Videos
  videos: [{
    url: { type: String },
    thumbnail: { type: String }
  }],
  
  // Inventory
  inventory: {
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },
    backorder: {
      type: Boolean,
      default: false
    },
    allowOutOfStockPurchase: {
      type: Boolean,
      default: false
    }
  },
  
  // Shipping
  shipping: {
    weight: {
      value: { type: Number },
      unit: { type: String, enum: ['kg', 'lbs'] }
    },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
      unit: { type: String, enum: ['cm', 'inches'] }
    },
    shippingClass: { type: String, trim: true }
  },
  
  // SEO
  seo: {
    metaTitle: { type: String, trim: true, maxlength: 60 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
    metaKeywords: [{ type: String, trim: true }]
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  
  // Flags
  isFeatured: {
    type: Boolean,
    default: false
  },
  isBestSeller: {
    type: Boolean,
    default: false
  },
  isNewArrival: {
    type: Boolean,
    default: false
  },
  isOnSale: {
    type: Boolean,
    default: false
  },
  
  // Related products
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  
  // Tags
  tags: [{ type: String, trim: true }],
  
  // Custom fields
  customAttributes: [{
    name: { type: String, required: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed },
    type: { type: String, enum: ['string', 'number', 'boolean', 'array'] }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product'
});

// Virtual for checking if product is in stock
productSchema.virtual('inStock').get(function() {
  return this.inventory.stock > 0 || this.inventory.allowOutOfStockPurchase;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.pricing.salePrice && this.pricing.basePrice > this.pricing.salePrice) {
    return Math.round(((this.pricing.basePrice - this.pricing.salePrice) / this.pricing.basePrice) * 100);
  }
  return 0;
});

// Indexes for better query performance
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ parentCategory: 1, subCategory: 1 });
productSchema.index({ status: 1, isFeatured: 1 });
productSchema.index({ 'pricing.salePrice': 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ roomTypes: 1 });
productSchema.index({ applications: 1 });
productSchema.index({ surfaceFinish: 1 });
productSchema.index({ colors: 1 });

// Pre-save middleware to generate slug and update price range
productSchema.pre('save', function(next) {
  // Generate slug from name if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // Update price range
  const currentPrice = this.pricing.salePrice || this.pricing.basePrice;
  this.priceRange = {
    min: currentPrice,
    max: currentPrice
  };
  
  next();
});

// Method to update ratings
productSchema.methods.updateRatings = function(newRating) {
  const oldRating = this.ratings.average;
  const oldCount = this.ratings.count;
  
  this.ratings.count += 1;
  this.ratings.average = ((oldRating * oldCount) + newRating) / this.ratings.count;
  
  // Update rating distribution
  const ratingKey = Math.floor(newRating);
  if (this.ratings.distribution[ratingKey] !== undefined) {
    this.ratings.distribution[ratingKey] += 1;
  }
};

// Method to check stock availability
productSchema.methods.checkStock = function(quantity) {
  if (this.inventory.allowOutOfStockPurchase) {
    return true;
  }
  return this.inventory.stock >= quantity;
};

// Method to decrease stock
productSchema.methods.decreaseStock = function(quantity) {
  if (!this.inventory.allowOutOfStockPurchase) {
    this.inventory.stock = Math.max(0, this.inventory.stock - quantity);
  }
};

// Method to increase stock
productSchema.methods.increaseStock = function(quantity) {
  this.inventory.stock += quantity;
};

const Product = mongoose.model('Product', productSchema);
export default Product;