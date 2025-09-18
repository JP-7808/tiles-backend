import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart,
  checkWishlist
} from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getWishlist)
  .post(protect, addToWishlist)
  .delete(protect, clearWishlist);

router.route('/check/:productId')
  .get(protect, checkWishlist);

router.route('/:productId')
  .delete(protect, removeFromWishlist);

router.route('/:productId/move-to-cart')
  .post(protect, moveToCart);

export default router;