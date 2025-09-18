import express from 'express';
import {
  getFilterOptions,
  filterProducts,
  getProductsByCategory
} from '../controllers/filterController.js';

const router = express.Router();

router.route('/options')
  .get(getFilterOptions);

router.route('/')
  .post(filterProducts);

router.route('/category/:categorySlug')
  .get(getProductsByCategory);

export default router;