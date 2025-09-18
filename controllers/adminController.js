import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import Wishlist from '../models/Wishlist.js';
import { cloudinary } from '../config/cloudinary.js';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').populate('addresses');
  res.status(200).json({
    success: true,
    users,
  });
});

// @desc    Update user role or status
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const { role, isActive } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.role = role || user.role;
  user.isActive = isActive !== undefined ? isActive : user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await User.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, message: 'User deleted successfully' });
});





// @desc    Get all products
// @route   GET /api/admin/products
// @access  Private/Admin
export const getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const products = await Product.find({})
    .populate('parentCategory', 'name')
    .populate('subCategory', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalProducts = await Product.countDocuments();
  const totalPages = Math.ceil(totalProducts / limit);

  res.status(200).json({
    success: true,
    products,
    pagination: {
      currentPage: page,
      totalPages,
      totalProducts,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

// @desc    Get single product
// @route   GET /api/admin/products/:id
// @access  Private/Admin
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('parentCategory', 'name')
    .populate('subCategory', 'name')
    .populate('relatedProducts', 'name slug images');

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.status(200).json({
    success: true,
    product,
  });
});

// @desc    Create a product
// @route   POST /api/admin/products
// @access  Private/Admin
// @desc    Create a product
// @route   POST /api/admin/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    shortDescription,
    sizes,
    surfaceFinish,
    roomTypes,
    applications,
    parentCategory,
    subCategory,
    finishes,
    filterSizes,
    colors,
    basePrice,
    salePrice,
    costPrice,
    priceUnit,
    taxRate,
    materialType,
    finish,
    application,
    brand,
    quality,
    coverageArea,
    piecesPerBox,
    description,
    maintenance,
    disclaimer,
    features,
    installation,
    warranty,
    stock,
    lowStockThreshold,
    allowOutOfStockPurchase,
    weightValue,
    weightUnit,
    dimensions,
    metaTitle,
    metaDescription,
    metaKeywords,
    status,
    isFeatured,
    isBestSeller,
    isNewArrival,
    isOnSale,
    relatedProducts,
    tags,
    sku
  } = req.body;

  if (!name || !shortDescription || !parentCategory || !basePrice || !sku) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');

  // Process images
  const images = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      images.push({
        url: file.path,
        public_id: file.filename,
        isPrimary: images.length === 0 // First image as primary
      });
    }
  }

  // Parse JSON fields with proper error handling
  const parseJSONField = (field, defaultValue = []) => {
    try {
      return field ? JSON.parse(field) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const parsedSizes = parseJSONField(sizes);
  const parsedFilterSizes = parseJSONField(filterSizes);
  const parsedColors = parseJSONField(colors);
  const parsedFeatures = parseJSONField(features);
  const parsedRelatedProducts = parseJSONField(relatedProducts);
  const parsedTags = parseJSONField(tags);
  const parsedRoomTypes = parseJSONField(roomTypes);
  const parsedApplications = parseJSONField(applications);
  const parsedFinishes = parseJSONField(finishes);
  const parsedMetaKeywords = parseJSONField(metaKeywords, []);
  const parsedCoverageArea = parseJSONField(coverageArea, {});
  const parsedWarranty = parseJSONField(warranty, {});
  const parsedDimensions = parseJSONField(dimensions, {});

  // Handle shipping weight
  const shippingWeight = weightValue ? {
    value: parseFloat(weightValue),
    unit: weightUnit || 'kg'
  } : undefined;

  const product = await Product.create({
    name,
    slug,
    sku: sku.toUpperCase().trim(),
    shortDescription,
    sizes: parsedSizes,
    surfaceFinish: surfaceFinish || 'glossy',
    roomTypes: parsedRoomTypes,
    applications: parsedApplications,
    parentCategory,
    subCategory: subCategory || null,
    finishes: parsedFinishes,
    filterSizes: parsedFilterSizes,
    colors: parsedColors,
    pricing: {
      basePrice: parseFloat(basePrice),
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      priceUnit: priceUnit || 'piece',
      taxRate: taxRate ? parseFloat(taxRate) : 0
    },
    specifications: {
      materialType: materialType || '',
      finish: finish || '',
      application: application || '',
      brand: brand || '',
      quality: quality || '',
      coverageArea: parsedCoverageArea,
      piecesPerBox: piecesPerBox ? parseInt(piecesPerBox) : undefined
    },
    details: {
      description: description || '',
      maintenance: maintenance || '',
      disclaimer: disclaimer || '',
      features: parsedFeatures,
      installation: installation || '',
      warranty: parsedWarranty
    },
    images,
    inventory: {
      stock: stock ? parseInt(stock) : 0,
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : 5,
      allowOutOfStockPurchase: allowOutOfStockPurchase === 'true'
    },
    shipping: {
      weight: shippingWeight,
      dimensions: parsedDimensions
    },
    seo: {
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
      metaKeywords: parsedMetaKeywords
    },
    status: status || 'draft',
    isFeatured: isFeatured === 'true',
    isBestSeller: isBestSeller === 'true',
    isNewArrival: isNewArrival === 'true',
    isOnSale: isOnSale === 'true',
    relatedProducts: parsedRelatedProducts,
    tags: parsedTags
  });

  res.status(201).json({
    success: true,
    product,
  });
});

// @desc    Update a product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const {
    name,
    shortDescription,
    sizes,
    surfaceFinish,
    roomTypes,
    applications,
    parentCategory,
    subCategory,
    finishes,
    filterSizes,
    colors,
    basePrice,
    salePrice,
    costPrice,
    priceUnit,
    taxRate,
    materialType,
    finish,
    application,
    brand,
    quality,
    coverageArea,
    piecesPerBox,
    description,
    maintenance,
    disclaimer,
    features,
    installation,
    warranty,
    stock,
    lowStockThreshold,
    allowOutOfStockPurchase,
    weightValue,
    weightUnit,
    dimensions,
    metaTitle,
    metaDescription,
    metaKeywords,
    status,
    isFeatured,
    isBestSeller,
    isNewArrival,
    isOnSale,
    relatedProducts,
    tags,
    sku
  } = req.body;

  // Update basic fields
  if (name) {
    product.name = name;
    product.slug = name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  if (shortDescription) product.shortDescription = shortDescription;
  if (surfaceFinish) product.surfaceFinish = surfaceFinish;
  if (parentCategory) product.parentCategory = parentCategory;
  if (subCategory) product.subCategory = subCategory;
  if (sku) product.sku = sku.toUpperCase().trim();

  // Parse JSON fields with proper error handling
  const parseJSONField = (field) => {
    try {
      return field ? JSON.parse(field) : undefined;
    } catch (error) {
      return undefined;
    }
  };

  if (sizes) product.sizes = parseJSONField(sizes) || product.sizes;
  if (roomTypes) product.roomTypes = parseJSONField(roomTypes) || product.roomTypes;
  if (applications) product.applications = parseJSONField(applications) || product.applications;
  if (finishes) product.finishes = parseJSONField(finishes) || product.finishes;
  if (filterSizes) product.filterSizes = parseJSONField(filterSizes) || product.filterSizes;
  if (colors) product.colors = parseJSONField(colors) || product.colors;
  if (features) product.details.features = parseJSONField(features) || product.details.features;
  if (relatedProducts) product.relatedProducts = parseJSONField(relatedProducts) || product.relatedProducts;
  if (tags) product.tags = parseJSONField(tags) || product.tags;
  if (metaKeywords) product.seo.metaKeywords = parseJSONField(metaKeywords) || product.seo.metaKeywords;
  if (coverageArea) product.specifications.coverageArea = parseJSONField(coverageArea) || product.specifications.coverageArea;
  if (warranty) product.details.warranty = parseJSONField(warranty) || product.details.warranty;
  if (dimensions) product.shipping.dimensions = parseJSONField(dimensions) || product.shipping.dimensions;

  // Update pricing
  if (basePrice) product.pricing.basePrice = parseFloat(basePrice);
  if (salePrice) product.pricing.salePrice = parseFloat(salePrice);
  if (costPrice) product.pricing.costPrice = parseFloat(costPrice);
  if (priceUnit) product.pricing.priceUnit = priceUnit;
  if (taxRate) product.pricing.taxRate = parseFloat(taxRate);

  // Update specifications
  if (materialType) product.specifications.materialType = materialType;
  if (finish) product.specifications.finish = finish;
  if (application) product.specifications.application = application;
  if (brand) product.specifications.brand = brand;
  if (quality) product.specifications.quality = quality;
  if (piecesPerBox) product.specifications.piecesPerBox = parseInt(piecesPerBox);

  // Update details
  if (description) product.details.description = description;
  if (maintenance) product.details.maintenance = maintenance;
  if (disclaimer) product.details.disclaimer = disclaimer;
  if (installation) product.details.installation = installation;

  // Update inventory
  if (stock) product.inventory.stock = parseInt(stock);
  if (lowStockThreshold) product.inventory.lowStockThreshold = parseInt(lowStockThreshold);
  if (allowOutOfStockPurchase !== undefined) {
    product.inventory.allowOutOfStockPurchase = allowOutOfStockPurchase === 'true';
  }

  // Update shipping weight
  if (weightValue) {
    product.shipping.weight = {
      value: parseFloat(weightValue),
      unit: weightUnit || 'kg'
    };
  }

  // Update SEO
  if (metaTitle) product.seo.metaTitle = metaTitle;
  if (metaDescription) product.seo.metaDescription = metaDescription;

  // Update status and flags
  if (status) product.status = status;
  if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true';
  if (isBestSeller !== undefined) product.isBestSeller = isBestSeller === 'true';
  if (isNewArrival !== undefined) product.isNewArrival = isNewArrival === 'true';
  if (isOnSale !== undefined) product.isOnSale = isOnSale === 'true';

  // Handle new images
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      product.images.push({
        url: file.path,
        public_id: file.filename,
        isPrimary: false
      });
    }
  }

  await product.save();

  res.status(200).json({
    success: true,
    product,
  });
});

// @desc    Delete a product
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Delete images from Cloudinary
  for (const image of product.images) {
    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id);
    }
  }

  await Product.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, message: 'Product deleted successfully' });
});

// @desc    Update product image
// @route   PUT /api/admin/products/:id/images
// @access  Private/Admin
export const updateProductImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No image provided' });
  }

  const imageIndex = parseInt(req.body.index);
  const isPrimary = req.body.isPrimary === 'true';

  if (imageIndex >= 0 && imageIndex < product.images.length) {
    // Delete old image from Cloudinary
    if (product.images[imageIndex].public_id) {
      await cloudinary.uploader.destroy(product.images[imageIndex].public_id);
    }

    // Update image
    product.images[imageIndex] = {
      url: req.file.path,
      public_id: req.file.filename,
      isPrimary
    };
  } else {
    // Add new image
    product.images.push({
      url: req.file.path,
      public_id: req.file.filename,
      isPrimary
    });
  }

  await product.save();

  res.status(200).json({
    success: true,
    product,
  });
});

// @desc    Delete product image
// @route   DELETE /api/admin/products/:id/images/:imageIndex
// @access  Private/Admin
export const deleteProductImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const imageIndex = parseInt(req.params.imageIndex);

  if (imageIndex < 0 || imageIndex >= product.images.length) {
    return res.status(400).json({ message: 'Invalid image index' });
  }

  // Delete image from Cloudinary
  if (product.images[imageIndex].public_id) {
    await cloudinary.uploader.destroy(product.images[imageIndex].public_id);
  }

  // Remove image from array
  product.images.splice(imageIndex, 1);

  await product.save();

  res.status(200).json({
    success: true,
    product,
  });
});




// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
export const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'name email').populate('items.product');
  res.status(200).json({
    success: true,
    orders,
  });
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin
export const updateOrder = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  order.orderStatus = orderStatus || order.orderStatus;
  order.paymentStatus = paymentStatus || order.paymentStatus;
  await order.save();

  res.status(200).json({
    success: true,
    order,
  });
});

// @desc    Create a category
// @route   POST /api/admin/categories
// @access  Private/Admin
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, parentCategory, filters, isActive } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  const image = req.file ? { url: req.file.path, public_id: req.file.filename } : {};

  const category = await Category.create({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description,
    image,
    parentCategory,
    filters,
    isActive,
  });

  res.status(201).json({
    success: true,
    category,
  });
});

// @desc    Update a category
// @route   PUT /api/admin/categories/:id
// @access  Private/Admin
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  const { name, description, parentCategory, filters, isActive } = req.body;

  category.name = name || category.name;
  category.slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : category.slug;
  category.description = description || category.description;
  category.parentCategory = parentCategory || category.parentCategory;
  category.filters = filters || category.filters;
  category.isActive = isActive !== undefined ? isActive : category.isActive;

  if (req.file) {
    if (category.image.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }
    category.image = { url: req.file.path, public_id: req.file.filename };
  }

  await category.save();
  res.status(200).json({
    success: true,
    category,
  });
});

// @desc    Delete a category
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  if (category.image.public_id) {
    await cloudinary.uploader.destroy(category.image.public_id);
  }

  await Category.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, message: 'Category deleted successfully' });
});

// @desc    Create a coupon
// @route   POST /api/admin/coupons
// @access  Private/Admin
export const createCoupon = asyncHandler(async (req, res) => {
  const {
    code, description, discountType, discountValue, minOrderValue, maxDiscount,
    startDate, endDate, usageLimit, userLimit, categories, products, isActive,
  } = req.body;

  if (!code || !discountType || !discountValue || !startDate || !endDate) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    description,
    discountType,
    discountValue,
    minOrderValue,
    maxDiscount,
    startDate,
    endDate,
    usageLimit,
    userLimit,
    categories,
    products,
    isActive,
  });

  res.status(201).json({
    success: true,
    coupon,
  });
});

// @desc    Update a coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  const {
    code, description, discountType, discountValue, minOrderValue, maxDiscount,
    startDate, endDate, usageLimit, userLimit, categories, products, isActive,
  } = req.body;

  coupon.code = code ? code.toUpperCase() : coupon.code;
  coupon.description = description || coupon.description;
  coupon.discountType = discountType || coupon.discountType;
  coupon.discountValue = discountValue || coupon.discountValue;
  coupon.minOrderValue = minOrderValue || coupon.minOrderValue;
  coupon.maxDiscount = maxDiscount || coupon.maxDiscount;
  coupon.startDate = startDate || coupon.startDate;
  coupon.endDate = endDate || coupon.endDate;
  coupon.usageLimit = usageLimit || coupon.usageLimit;
  coupon.userLimit = userLimit || coupon.userLimit;
  coupon.categories = categories || coupon.categories;
  coupon.products = products || coupon.products;
  coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;

  await coupon.save();
  res.status(200).json({
    success: true,
    coupon,
  });
});

// @desc    Delete a coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  await Coupon.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
});

// @desc    Get all reviews
// @route   GET /api/admin/reviews
// @access  Private/Admin
export const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({}).populate('user', 'name email').populate('product', 'name');
  res.status(200).json({
    success: true,
    reviews,
  });
});

// @desc    Update review status
// @route   PUT /api/admin/reviews/:id
// @access  Private/Admin
export const updateReview = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  review.status = status || review.status;
  await review.save();

  res.status(200).json({
    success: true,
    review,
  });
});

// @desc    Delete a review
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  for (const image of review.images) {
    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id);
    }
  }

  await Review.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, message: 'Review deleted successfully' });
});

// @desc    Get all wishlists
// @route   GET /api/admin/wishlists
// @access  Private/Admin
export const getWishlists = asyncHandler(async (req, res) => {
  const wishlists = await Wishlist.find({}).populate('user', 'name email').populate('items.product');
  res.status(200).json({
    success: true,
    wishlists,
  });
});

// @desc    Delete a wishlist
// @route   DELETE /api/admin/wishlists/:id
// @access  Private/Admin
export const deleteWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findById(req.params.id);

  if (!wishlist) {
    return res.status(404).json({ message: 'Wishlist not found' });
  }

  await Wishlist.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, message: 'Wishlist deleted successfully' });
});