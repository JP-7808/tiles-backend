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





// Add these product-related functions to your adminController.js file

// @desc    Get all products
// @route   GET /api/admin/products
// @access  Private/Admin
export const getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const products = await Product.find({})
    .populate('category', 'name')
    .populate('subCategory', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
    
  const total = await Product.countDocuments();
  
  res.status(200).json({
    success: true,
    products,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      total
    }
  });
});

// @desc    Get single product
// @route   GET /api/admin/products/:id
// @access  Private/Admin
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name')
    .populate('subCategory', 'name');
    
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
    description,
    shortDescription,
    price,
    comparePrice,
    costPerItem,
    category,
    subCategory,
    specifications, // This comes as a string from form-data
    stock,
    sku,
    barcode,
    weight,
    tags,
    isActive,
    isFeatured
  } = req.body;

  // Log the raw specifications input
  console.log('Raw specifications input:', specifications);

  // Validate required fields
  if (!name || !description || !price || !category || !sku) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  // Parse specifications from string to object
  let specs = {};
  if (specifications && specifications !== 'undefined') {
    try {
      specs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
      // Ensure specifications is an object, not an array
      if (Array.isArray(specs)) {
        if (specs.length > 0) {
          specs = specs[0]; // Extract the first object if sent as an array
        } else {
          return res.status(400).json({ 
            message: 'Invalid specifications format. Array is empty.'
          });
        }
      }
      // Validate that specs is an object
      if (typeof specs !== 'object' || specs === null) {
        return res.status(400).json({ 
          message: 'Invalid specifications format. Must be a JSON object.'
        });
      }
      // Log the parsed specifications
      console.log('Parsed specifications:', JSON.stringify(specs, null, 2));
    } catch (error) {
      console.error('Specifications parse error:', error);
      return res.status(400).json({ 
        message: 'Invalid specifications format. Must be valid JSON.',
        error: error.message 
      });
    }
  }

  // Parse tags from string to array
  let parsedTags = [];
  if (tags && tags !== 'undefined') {
    try {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      if (!Array.isArray(parsedTags)) {
        parsedTags = typeof tags === 'string' 
          ? tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') 
          : [];
      }
    } catch (error) {
      parsedTags = typeof tags === 'string' 
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') 
        : [];
    }
  }

  // Parse weight from string to object
  let weightObj = {};
  if (weight && weight !== 'undefined') {
    try {
      weightObj = typeof weight === 'string' ? JSON.parse(weight) : weight;
    } catch (error) {
      console.error('Weight parse error:', error);
      return res.status(400).json({ 
        message: 'Invalid weight format. Must be valid JSON.',
        error: error.message 
      });
    }
  }

  // Process uploaded images
  const images = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach((file, index) => {
      images.push({
        url: file.path,
        public_id: file.filename,
        isPrimary: index === 0 // Set first image as primary
      });
    });
  }

  try {
    // Create the product object
    const productData = {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description,
      shortDescription,
      price: parseFloat(price),
      comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
      costPerItem: costPerItem ? parseFloat(costPerItem) : undefined,
      category,
      subCategory: subCategory || undefined,
      specifications: specs, // Use parsed object
      images,
      stock: parseInt(stock),
      sku,
      barcode: barcode || undefined,
      weight: weightObj,
      tags: parsedTags,
      isActive: isActive !== undefined ? isActive === 'true' : true,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : false
    };

    // Log the product data before saving
    console.log('Product data to save:', JSON.stringify({ ...productData, specifications: productData.specifications }, null, 2));

    const product = new Product(productData);
    
    // Log specifications before saving
    console.log('Specifications before save:', JSON.stringify(product.specifications, null, 2));

    await product.save();

    // Log the created product specifications
    console.log('Created product specifications:', JSON.stringify(product.specifications, null, 2));

    res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('Product creation error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
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
    description,
    shortDescription,
    price,
    comparePrice,
    costPerItem,
    category,
    subCategory,
    specifications,
    stock,
    sku,
    barcode,
    weight,
    tags,
    isActive,
    isFeatured,
    removeImages
  } = req.body;
  
  // Parse specifications if it's a string
  if (specifications && typeof specifications === 'string') {
    try {
      product.specifications = JSON.parse(specifications);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid specifications format' });
    }
  } else if (specifications) {
    product.specifications = specifications;
  }
  
  // Parse tags if it's a string
  if (tags && typeof tags === 'string') {
    try {
      product.tags = JSON.parse(tags);
    } catch (error) {
      product.tags = tags.split(',').map(tag => tag.trim());
    }
  } else if (tags) {
    product.tags = tags;
  }
  
  // Handle image removal
  if (removeImages && typeof removeImages === 'string') {
    try {
      const imagesToRemove = JSON.parse(removeImages);
      for (const imageId of imagesToRemove) {
        const image = product.images.id(imageId);
        if (image && image.public_id) {
          await cloudinary.uploader.destroy(image.public_id);
        }
        product.images.pull(imageId);
      }
    } catch (error) {
      return res.status(400).json({ message: 'Invalid removeImages format' });
    }
  }
  
  // Add new images
  if (req.files && req.files.length > 0) {
    req.files.forEach((file) => {
      product.images.push({
        url: file.path,
        public_id: file.filename,
        isPrimary: product.images.length === 0 // Set as primary if no images exist
      });
    });
  }
  
  // Update other fields
  product.name = name || product.name;
  product.slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : product.slug;
  product.description = description || product.description;
  product.shortDescription = shortDescription || product.shortDescription;
  product.price = price || product.price;
  product.comparePrice = comparePrice !== undefined ? comparePrice : product.comparePrice;
  product.costPerItem = costPerItem !== undefined ? costPerItem : product.costPerItem;
  product.category = category || product.category;
  product.subCategory = subCategory || product.subCategory;
  product.stock = stock !== undefined ? stock : product.stock;
  product.sku = sku || product.sku;
  product.barcode = barcode || product.barcode;
  
  if (weight) {
    product.weight = typeof weight === 'string' ? JSON.parse(weight) : weight;
  }
  
  product.isActive = isActive !== undefined ? isActive : product.isActive;
  product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured;
  
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
  
  // Delete all associated images from Cloudinary
  for (const image of product.images) {
    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id);
    }
  }
  
  await Product.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, message: 'Product deleted successfully' });
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