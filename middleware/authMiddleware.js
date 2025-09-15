import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';

// Protect routes - verify JWT
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1️⃣ Check for token in cookies first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2️⃣ If no cookie token, check Authorization header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 3️⃣ If no token found at all
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }

  try {
    // 4️⃣ Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5️⃣ Attach user to req (exclude password)
    req.user = await User.findById(decoded.id).select('-password');

    // 6️⃣ User existence check
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // 7️⃣ Check if account is active
    if (!req.user.isActive) {
      return res.status(401).json({ message: 'Account has been deactivated' });
    }

    // 8️⃣ Proceed
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
});

// Admin middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

// Optional auth - doesn't fail if no token
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Continue without user if token is invalid
      console.error('Optional auth token error:', error);
    }
  }

  next();
});