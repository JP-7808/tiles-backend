import asyncHandler from 'express-async-handler';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const skip = (page - 1) * limit;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const reviews = await Review.find({ 
    product: productId, 
    status: 'approved' 
  })
    .populate('user', 'name profileImage')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  const totalReviews = await Review.countDocuments({ 
    product: productId, 
    status: 'approved' 
  });
  const totalPages = Math.ceil(totalReviews / limit);

  // Get rating distribution
  const ratingDistribution = await Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  // Get average rating
  const averageRating = await Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    reviews,
    ratingStats: {
      average: averageRating[0]?.average || 0,
      total: averageRating[0]?.count || 0,
      distribution: ratingDistribution.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
    },
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalReviews,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    }
  });
});

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
export const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, title, comment, images } = req.body;

  if (!productId || !rating) {
    return res.status(400).json({ message: 'Product ID and rating are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Check if user has already reviewed this product
  const existingReview = await Review.findOne({
    user: req.user._id,
    product: productId
  });

  if (existingReview) {
    return res.status(400).json({ message: 'You have already reviewed this product' });
  }

  // Check if user has purchased the product (optional verification)
  const hasPurchased = await Order.findOne({
    user: req.user._id,
    'items.product': productId,
    orderStatus: 'delivered'
  });

  const review = await Review.create({
    user: req.user._id,
    product: productId,
    rating: parseInt(rating),
    title,
    comment,
    images: images || [],
    isVerifiedPurchase: !!hasPurchased,
    status: 'pending' // Admin approval required
  });

  // Update product ratings
  await product.updateRatings(parseInt(rating));
  await product.save();

  await review.populate('user', 'name profileImage');

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully. Waiting for admin approval.',
    review
  });
});

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, title, comment, images } = req.body;

  const review = await Review.findById(id).populate('product');

  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  // Check if user owns the review
  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to update this review' });
  }

  const oldRating = review.rating;

  if (rating) review.rating = parseInt(rating);
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;
  if (images !== undefined) review.images = images;

  review.status = 'pending'; // Back to pending after update

  await review.save();

  // Update product ratings if rating changed
  if (rating && oldRating !== parseInt(rating)) {
    const product = await Product.findById(review.product._id);
    if (product) {
      // Recalculate average rating
      const reviews = await Review.find({ 
        product: review.product._id, 
        status: 'approved' 
      });
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      product.ratings.average = totalRating / reviews.length;
      product.ratings.count = reviews.length;
      await product.save();
    }
  }

  await review.populate('user', 'name profileImage');

  res.status(200).json({
    success: true,
    message: 'Review updated successfully. Waiting for admin approval.',
    review
  });
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id).populate('product');

  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  // Check if user owns the review or is admin
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to delete this review' });
  }

  const productId = review.product._id;

  await Review.deleteOne({ _id: id });

  // Update product ratings
  const product = await Product.findById(productId);
  if (product) {
    const reviews = await Review.find({ 
      product: productId, 
      status: 'approved' 
    });
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      product.ratings.average = totalRating / reviews.length;
      product.ratings.count = reviews.length;
    } else {
      product.ratings.average = 0;
      product.ratings.count = 0;
    }
    
    await product.save();
  }

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully'
  });
});

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
export const markHelpful = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { helpful } = req.body; // true or false

  const review = await Review.findById(id);

  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  if (helpful) {
    review.helpful.yes += 1;
  } else {
    review.helpful.no += 1;
  }

  await review.save();

  res.status(200).json({
    success: true,
    message: 'Feedback recorded',
    helpful: review.helpful
  });
});

// @desc    Get user's reviews
// @route   GET /api/reviews/user
// @access  Private
export const getUserReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const reviews = await Review.find({ user: req.user._id })
    .populate('product', 'name images slug')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalReviews = await Review.countDocuments({ user: req.user._id });
  const totalPages = Math.ceil(totalReviews / limit);

  res.status(200).json({
    success: true,
    reviews,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalReviews,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    }
  });
});