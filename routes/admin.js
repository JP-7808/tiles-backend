import express from 'express';
import {
  getUsers,
  updateUser,
  deleteUser,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrder,
  createCategory,
  updateCategory,
  deleteCategory,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getReviews,
  updateReview,
  deleteReview,
  getWishlists,
  deleteWishlist,
  getProducts,
  getProductById,
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// User routes
router.route('/users')
  .get(protect, admin, getUsers);
router.route('/users/:id')
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

// Product routes
router.route('/products')
  .get(protect, admin, getProducts)
  .post(protect, admin, upload.array('images', 5), createProduct);
router.route('/products/:id')
  .get(protect, admin, getProductById)
  .put(protect, admin, upload.array('images', 5), updateProduct)
  .delete(protect, admin, deleteProduct);

// Order routes
router.route('/orders')
  .get(protect, admin, getOrders);
router.route('/orders/:id')
  .put(protect, admin, updateOrder);

// Category routes
router.route('/categories')
  .post(protect, admin, upload.single('image'), createCategory);
router.route('/categories/:id')
  .put(protect, admin, upload.single('image'), updateCategory)
  .delete(protect, admin, deleteCategory);

// Coupon routes
router.route('/coupons')
  .post(protect, admin, createCoupon);
router.route('/coupons/:id')
  .put(protect, admin, updateCoupon)
  .delete(protect, admin, deleteCoupon);

// Review routes
router.route('/reviews')
  .get(protect, admin, getReviews);
router.route('/reviews/:id')
  .put(protect, admin, updateReview)
  .delete(protect, admin, deleteReview);

// Wishlist routes
router.route('/wishlists')
  .get(protect, admin, getWishlists);
router.route('/wishlists/:id')
  .delete(protect, admin, deleteWishlist);

export default router;