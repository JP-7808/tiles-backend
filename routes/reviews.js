import express from 'express';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  getUserReviews
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/product/:productId')
  .get(getProductReviews);

router.route('/user')
  .get(protect, getUserReviews);

router.route('/')
  .post(protect, createReview);

router.route('/:id')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

router.route('/:id/helpful')
  .post(protect, markHelpful);

export default router;