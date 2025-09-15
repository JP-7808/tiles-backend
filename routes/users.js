import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/addresses').post(protect, addAddress);
router.route('/addresses/:id').put(protect, updateAddress).delete(protect, deleteAddress);
router.route('/wishlist').post(protect, addToWishlist);
router.route('/wishlist/:productId').delete(protect, removeFromWishlist);

export default router;