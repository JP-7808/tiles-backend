import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { cloudinary } from '../config/cloudinary.js';
import sendEmail from '../utils/emailService.js';
import crypto from 'crypto'
import dotenv from "dotenv";

dotenv.config();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d', // Fallback to 7 days
  });
};

// Send response with token
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  // Ensure JWT_COOKIE_EXPIRE is a valid number
  const cookieExpireDays = parseInt(process.env.JWT_COOKIE_EXPIRE) || 7;
  const options = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Secure only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax', // Improve security
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Input validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
  });

  // Generate OTP and send email
  const otp = user.generateEmailVerificationOTP();
  await user.save();

  try {
    await sendEmail({
      email: user.email,
      subject: 'Email Verification OTP - TileCraft',
      message: `Your OTP for email verification is: ${otp}\nThis OTP will expire in 10 minutes.`,
    });
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
    // Continue even if email fails
  }

  sendTokenResponse(user, 201, res);
});

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Private
export const verifyEmail = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ message: 'OTP is required' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({ message: 'Email already verified' });
  }

  try {
    user.verifyOTP(otp);
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    await user.save(); // Save the updated attempts/lock status
    res.status(400).json({ message: error.message });
  }
});

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Private
export const resendOTP = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({ message: 'Email already verified' });
  }

  try {
    const otp = user.resendOTP();
    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: 'New Verification OTP - TileCraft',
        message: `Your new OTP for email verification is: ${otp}\nThis OTP will expire in 10 minutes.`,
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Check if account is locked
  if (user.isLocked) {
    return res.status(401).json({ message: 'Account is temporarily locked. Try again later.' });
  }

  // Verify password
  if (!(await user.correctPassword(password, user.password))) {
    await user.incrementLoginAttempts();
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('addresses');

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      addresses: user.addresses,
      wishlist: user.wishlist,
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.name = name || user.name;
  user.phone = phone || user.phone;

  const updatedUser = await user.save();

  res.json({
    success: true,
    user: {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profileImage: updatedUser.profileImage,
      role: updatedUser.role,
      isEmailVerified: updatedUser.isEmailVerified,
    },
  });
});

// @desc    Upload profile image
// @route   POST /api/auth/upload-profile-image
// @access  Private
export const uploadProfileImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload an image' });
  }

  // Delete old image if exists
  if (user.profileImage.public_id) {
    try {
      await cloudinary.uploader.destroy(user.profileImage.public_id);
    } catch (error) {
      console.error('Error deleting old image:', error);
    }
  }

  user.profileImage = {
    url: req.file.path,
    public_id: req.file.filename,
  };

  await user.save();

  res.json({
    success: true,
    message: 'Profile image uploaded successfully',
    profileImage: user.profileImage,
  });
});

// @desc    Delete profile image
// @route   DELETE /api/auth/delete-profile-image
// @access  Private
export const deleteProfileImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.profileImage.public_id) {
    try {
      await cloudinary.uploader.destroy(user.profileImage.public_id);
    } catch (error) {
      console.error('Error deleting image:', error);
    }

    user.profileImage = {
      url: '',
      public_id: '',
    };

    await user.save();
  }

  res.json({
    success: true,
    message: 'Profile image deleted successfully',
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save();

  // Create reset URL
  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request - TileCraft',
      message: `You are receiving this email because you requested a password reset. Please make a PUT request to: \n\n ${resetUrl}`,
    });

    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error(error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(500).json({ message: 'Email could not be sent' });
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
  });
});