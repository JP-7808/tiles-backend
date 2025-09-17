import asyncHandler from 'express-async-handler';
import Address from '../models/Address.js';
import User from '../models/User.js';

// @desc    Create a new address
// @route   POST /api/addresses
// @access  Private
export const createAddress = asyncHandler(async (req, res) => {
  const { fullName, phone, street, city, state, pincode, landmark, addressType } = req.body;

  if (!fullName || !phone || !street || !city || !state || !pincode) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  const address = await Address.create({
    user: req.user.id,
    fullName,
    phone,
    street,
    city,
    state,
    pincode,
    landmark,
    addressType: addressType || 'home',
  });

  await User.findByIdAndUpdate(req.user.id, { $push: { addresses: address._id } });

  res.status(201).json({
    success: true,
    address: {
      id: address._id,
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark,
      addressType: address.addressType,
      isDefault: address.isDefault,
    },
  });
});

// @desc    Get all addresses for the authenticated user
// @route   GET /api/addresses
// @access  Private
export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    addresses: addresses.map(address => ({
      id: address._id,
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark,
      addressType: address.addressType,
      isDefault: address.isDefault,
    })),
  });
});

// @desc    Update an address
// @route   PUT /api/addresses/:id
// @access  Private
export const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, street, city, state, pincode, landmark, addressType } = req.body;

  const address = await Address.findById(id);

  if (!address) {
    return res.status(404).json({ message: 'Address not found' });
  }

  if (address.user.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to update this address' });
  }

  address.fullName = fullName || address.fullName;
  address.phone = phone || address.phone;
  address.street = street || address.street;
  address.city = city || address.city;
  address.state = state || address.state;
  address.pincode = pincode || address.pincode;
  address.landmark = landmark || address.landmark;
  address.addressType = addressType || address.addressType;

  const updatedAddress = await address.save();

  res.status(200).json({
    success: true,
    address: {
      id: updatedAddress._id,
      fullName: updatedAddress.fullName,
      phone: updatedAddress.phone,
      street: updatedAddress.street,
      city: updatedAddress.city,
      state: updatedAddress.state,
      pincode: updatedAddress.pincode,
      landmark: updatedAddress.landmark,
      addressType: updatedAddress.addressType,
      isDefault: updatedAddress.isDefault,
    },
  });
});

// @desc    Delete an address
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const address = await Address.findById(id);

  if (!address) {
    return res.status(404).json({ message: 'Address not found' });
  }

  if (address.user.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to delete this address' });
  }

  await Address.deleteOne({ _id: id });
  await User.findByIdAndUpdate(req.user.id, { $pull: { addresses: id } });

  res.status(200).json({
    success: true,
    message: 'Address deleted successfully',
  });
});

// @desc    Set an address as default
// @route   PUT /api/addresses/:id/set-default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const address = await Address.findById(id);

  if (!address) {
    return res.status(404).json({ message: 'Address not found' });
  }

  if (address.user.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to set this address as default' });
  }

  // Unset default flag for all other addresses
  await Address.updateMany(
    { user: req.user.id, isDefault: true },
    { $set: { isDefault: false } }
  );

  // Set the selected address as default
  address.isDefault = true;
  await address.save();

  res.status(200).json({
    success: true,
    message: 'Address set as default',
    address: {
      id: address._id,
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark,
      addressType: address.addressType,
      isDefault: address.isDefault,
    },
  });
});