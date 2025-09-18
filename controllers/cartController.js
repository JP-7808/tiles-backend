import asyncHandler from 'express-async-handler';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product', 'name images pricing inventory')
    .populate('coupon', 'code discountType discountValue maxDiscount');

  if (!cart) {
    return res.status(200).json({
      success: true,
      cart: {
        items: [],
        total: 0,
        discount: 0,
        coupon: null
      }
    });
  }

  res.status(200).json({
    success: true,
    cart,
  });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  if (!product.inventory.allowOutOfStockPurchase && product.inventory.stock < quantity) {
    return res.status(400).json({ message: 'Insufficient stock' });
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
      total: 0,
      discount: 0
    });
  }

  const existingItemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Update quantity if item already exists
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    
    if (!product.inventory.allowOutOfStockPurchase && product.inventory.stock < newQuantity) {
      return res.status(400).json({ message: 'Insufficient stock for the requested quantity' });
    }

    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].price = product.pricing.salePrice || product.pricing.basePrice;
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      quantity,
      price: product.pricing.salePrice || product.pricing.basePrice
    });
  }

  // Recalculate totals
  await calculateCartTotals(cart);

  await cart.save();
  await cart.populate('items.product', 'name images pricing inventory');

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    cart,
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  if (!quantity || quantity < 1) {
    return res.status(400).json({ message: 'Valid quantity is required' });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  const itemIndex = cart.items.findIndex(
    item => item._id.toString() === itemId
  );

  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Item not found in cart' });
  }

  const product = await Product.findById(cart.items[itemIndex].product);
  if (!product.inventory.allowOutOfStockPurchase && product.inventory.stock < quantity) {
    return res.status(400).json({ message: 'Insufficient stock' });
  }

  cart.items[itemIndex].quantity = quantity;

  // Recalculate totals
  await calculateCartTotals(cart);

  await cart.save();
  await cart.populate('items.product', 'name images pricing inventory');

  res.status(200).json({
    success: true,
    message: 'Cart item updated',
    cart,
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  cart.items = cart.items.filter(item => item._id.toString() !== itemId);

  // Recalculate totals
  await calculateCartTotals(cart);

  await cart.save();
  await cart.populate('items.product', 'name images pricing inventory');

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    cart,
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  
  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  cart.items = [];
  cart.total = 0;
  cart.discount = 0;
  cart.coupon = undefined;

  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    cart,
  });
});

// @desc    Apply coupon to cart
// @route   POST /api/cart/coupon
// @access  Private
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: 'Coupon code is required' });
  }

  const coupon = await Coupon.findOne({ 
    code: code.toUpperCase(), 
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  });

  if (!coupon) {
    return res.status(404).json({ message: 'Invalid or expired coupon' });
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ message: 'Coupon usage limit exceeded' });
  }

  const cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product', 'pricing');

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  // Check minimum order value
  if (coupon.minOrderValue && cart.total < coupon.minOrderValue) {
    return res.status(400).json({ 
      message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon` 
    });
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (cart.total * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  cart.discount = discount;
  cart.coupon = coupon._id;

  await cart.save();
  await cart.populate('coupon', 'code discountType discountValue maxDiscount');
  await cart.populate('items.product', 'name images pricing inventory');

  res.status(200).json({
    success: true,
    message: 'Coupon applied successfully',
    cart,
  });
});

// @desc    Remove coupon from cart
// @route   DELETE /api/cart/coupon
// @access  Private
export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  cart.discount = 0;
  cart.coupon = undefined;

  await cart.save();
  await cart.populate('items.product', 'name images pricing inventory');

  res.status(200).json({
    success: true,
    message: 'Coupon removed',
    cart,
  });
});

// Helper function to calculate cart totals
const calculateCartTotals = async (cart) => {
  await cart.populate('items.product', 'pricing inventory');

  let subtotal = 0;
  
  for (const item of cart.items) {
    const price = item.product.pricing.salePrice || item.product.pricing.basePrice;
    item.price = price;
    subtotal += price * item.quantity;
  }

  cart.total = subtotal - (cart.discount || 0);
  
  // Ensure total doesn't go negative
  if (cart.total < 0) {
    cart.total = 0;
  }
};