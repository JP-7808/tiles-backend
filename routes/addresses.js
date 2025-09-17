import express from 'express';
import {
  createAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/addressController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Address routes
router.route('/')
  .post(protect, createAddress)
  .get(protect, getAddresses);

router.route('/:id')
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

router.route('/:id/set-default')
  .put(protect, setDefaultAddress);

export default router;