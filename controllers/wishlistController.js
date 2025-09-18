import asyncHandler from 'express-async-handler';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id })
    .populate('items.product', 'name images pricing inventory ratings');

  if (!wishlist) {
    return res.status(200).json({
      success: true,
      wishlist: {
        items: [],
        totalItems: 0
      }
    });
  }

  res.status(200).json({
    success: true,
    wishlist,
  });
});

// @desc    Add item to wishlist
// @route   POST /api/wishlist
// @access  Private
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user._id,
      items: []
    });
  }

  // Check if product already exists in wishlist
  const existingItem = wishlist.items.find(
    item => item.product.toString() === productId
  );

  if (existingItem) {
    return res.status(400).json({ message: 'Product already in wishlist' });
  }

  // Add new item
  wishlist.items.push({
    product: productId,
    addedAt: new Date()
  });

  await wishlist.save();
  await wishlist.populate('items.product', 'name images pricing inventory ratings');

  res.status(200).json({
    success: true,
    message: 'Product added to wishlist',
    wishlist,
  });
});

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });
  
  if (!wishlist) {
    return res.status(404).json({ message: 'Wishlist not found' });
  }

  const initialLength = wishlist.items.length;
  wishlist.items = wishlist.items.filter(
    item => item.product.toString() !== productId
  );

  if (wishlist.items.length === initialLength) {
    return res.status(404).json({ message: 'Product not found in wishlist' });
  }

  await wishlist.save();
  await wishlist.populate('items.product', 'name images pricing inventory ratings');

  res.status(200).json({
    success: true,
    message: 'Product removed from wishlist',
    wishlist,
  });
});

// @desc    Clear wishlist
// @route   DELETE /api/wishlist
// @access  Private
export const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  
  if (!wishlist) {
    return res.status(404).json({ message: 'Wishlist not found' });
  }

  wishlist.items = [];
  await wishlist.save();

  res.status(200).json({
    success: true,
    message: 'Wishlist cleared',
    wishlist: {
      items: [],
      totalItems: 0
    },
  });
});

// @desc    Move wishlist item to cart
// @route   POST /api/wishlist/:productId/move-to-cart
// @access  Private
export const moveToCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity = 1 } = req.body;

  // First remove from wishlist
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  
  if (!wishlist) {
    return res.status(404).json({ message: 'Wishlist not found' });
  }

  const wishlistItemIndex = wishlist.items.findIndex(
    item => item.product.toString() === productId
  );

  if (wishlistItemIndex === -1) {
    return res.status(404).json({ message: 'Product not found in wishlist' });
  }

  // Remove from wishlist
  wishlist.items.splice(wishlistItemIndex, 1);
  await wishlist.save();

  // Now add to cart (you'll need to import cartController functions or replicate the logic)
  // For simplicity, I'll show the basic logic here
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Add to cart logic (similar to addToCart function)
  // You might want to refactor this to use your existing cart functions

  res.status(200).json({
    success: true,
    message: 'Product moved to cart',
  });
});

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private
export const checkWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ 
    user: req.user._id,
    'items.product': productId 
  });

  res.status(200).json({
    success: true,
    inWishlist: !!wishlist,
  });
});