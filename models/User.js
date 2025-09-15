import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Address from './Address.js'; // Import Address model to register it

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(phone) {
        if (!phone) return true;
        return /^[0-9]{10}$/.test(phone);
      },
      message: 'Phone number must be 10 digits (if provided)'
    }
  },
  profileImage: {
    url: {
      type: String,
      default: ''
    },
    public_id: {
      type: String,
      default: ''
    }
  },
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: {
    code: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  otpLockUntil: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for checking if OTP is locked
userSchema.virtual('isOtpLocked').get(function() {
  return !!(this.otpLockUntil && this.otpLockUntil > Date.now());
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to generate email verification OTP
userSchema.methods.generateEmailVerificationOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
  this.emailVerificationOTP = {
    code: otp,
    expiresAt: expiresAt
  };
  
  return otp;
};

// Method to verify OTP
userSchema.methods.verifyOTP = function(otp) {
  if (this.isOtpLocked) {
    throw new Error('OTP verification is temporarily locked. Please try again later.');
  }
  
  if (!this.emailVerificationOTP.code || !this.emailVerificationOTP.expiresAt) {
    throw new Error('No OTP found. Please request a new one.');
  }
  
  if (this.emailVerificationOTP.expiresAt < new Date()) {
    throw new Error('OTP has expired. Please request a new one.');
  }
  
  if (this.emailVerificationOTP.code !== otp) {
    this.otpAttempts += 1;
    
    if (this.otpAttempts >= 5) {
      this.otpLockUntil = new Date(Date.now() + 30 * 60 * 1000);
      this.otpAttempts = 0;
      throw new Error('Too many failed attempts. OTP verification locked for 30 minutes.');
    }
    
    throw new Error('Invalid OTP');
  }
  
  this.isEmailVerified = true;
  this.emailVerificationOTP = { code: null, expiresAt: null };
  this.otpAttempts = 0;
  this.otpLockUntil = null;
  
  return true;
};

// Method to resend OTP
userSchema.methods.resendOTP = function() {
  if (this.isOtpLocked) {
    throw new Error('Please wait before requesting a new OTP.');
  }
  
  return this.generateEmailVerificationOTP();
};

// Method to clear OTP
userSchema.methods.clearOTP = function() {
  this.emailVerificationOTP = { code: null, expiresAt: null };
};

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.incrementLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Indexes
userSchema.index({ isActive: 1, isEmailVerified: 1 });
userSchema.index({ 'emailVerificationOTP.expiresAt': 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model('User', userSchema);
export default User;