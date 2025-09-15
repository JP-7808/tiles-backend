import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Address from '../models/Address.js';
import Wishlist from '../models/Wishlist.js';
import Cart from '../models/Cart.js';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('addresses')
    .populate({
      path: 'wishlist',
      populate: { path: 'items.product' },
    });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    addresses: user.addresses,
    wishlist: user.wishlist,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.name = name || user.name;
  user.phone = phone || user.phone;

  const updatedUser = await user.save();

  res.status(200).json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    role: updatedUser.role,
  });
});

// @desc    Add address
// @route   POST /api/users/addresses
// @access  Private
const addAddress = asyncHandler(async (req, res) => {
  const { fullName, phone, street, city, state, pincode, landmark, addressType, isDefault } = req.body;

  if (!fullName || !phone || !street || !city || !state || !pincode) {
    res.status(400);
    throw new Error('Please provide all required address fields');
  }

  const address = await Address.create({
    user: req.user._id,
    fullName,
    phone,
    street,
    city,
    state,
    pincode,
    landmark,
    addressType: addressType || 'home',
    isDefault,
  });

  if (isDefault) {
    await Address.updateMany(
      { user: req.user._id, _id: { $ne: address._id } },
      { isDefault: false }
    );
  }

  await User.findByIdAndUpdate(req.user._id, { $push: { addresses: address._id } });

  res.status(201).json(address);
});

// @desc    Update address
// @route   PUT /api/users/addresses/:id
// @access  Private
const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, street, city, state, pincode, landmark, addressType, isDefault } = req.body;

  const address = await Address.findOne({ _id: id, user: req.user._id });

  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  address.fullName = fullName || address.fullName;
  address.phone = phone || address.phone;
  address.street = street || address.street;
  address.city = city || address.city;
  address.state = state || address.state;
  address.pincode = pincode || address.pincode;
  address.landmark = landmark || address.landmark;
  address.addressType = addressType || address.addressType;
  address.isDefault = isDefault !== undefined ? isDefault : address.isDefault;

  if (isDefault) {
    await Address.updateMany(
      { user: req.user._id, _id: { $ne: address._id } },
      { isDefault: false }
    );
  }

  const updatedAddress = await address.save();
  res.status(200).json(updatedAddress);
});

// @desc    Delete address
// @route   DELETE /api/users/addresses/:id
// @access  Private
const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const address = await Address.findOneAndDelete({ _id: id, user: req.user._id });

  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  await User.findByIdAndUpdate(req.user._id, { $pull: { addresses: id } });

  res.status(200).json({ message: 'Address deleted successfully' });
});

// @desc    Add to wishlist
// @route   POST /api/users/wishlist
// @access  Private
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error('Please provide product ID');
  }

  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user._id,
      items: [{ product: productId }],
    });
  } else {
    const itemExists = wishlist.items.some((item) => item.product.toString() === productId);
    if (itemExists) {
      res.status(400);
      throw new Error('Product already in wishlist');
    }
    wishlist.items.push({ product: productId });
    await wishlist.save();
  }

  res.status(200).json(wishlist);
});

// @desc    Remove from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    res.status(404);
    throw new Error('Wishlist not found');
  }

  wishlist.items = wishlist.items.filter((item) => item.product.toString() !== productId);
  await wishlist.save();

  res.status(200).json(wishlist);
});

export {
  getUserProfile,
  updateUserProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  addToWishlist,
  removeFromWishlist,
};