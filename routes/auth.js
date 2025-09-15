import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  verifyEmail,
  resendOTP,
  uploadProfileImage,
  deleteProfileImage,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.post('/verify-email', protect, verifyEmail);
router.post('/resend-otp', protect, resendOTP);
router.post('/upload-profile-image', protect, upload.single('image'), uploadProfileImage);
router.delete('/delete-profile-image', protect, deleteProfileImage);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

export default router;