import express from 'express';
import {
  searchProducts,
  getSearchSuggestions,
  advancedSearch,
  getPopularSearches
} from '../controllers/searchController.js';

const router = express.Router();

router.route('/')
  .get(searchProducts);

router.route('/suggestions')
  .get(getSearchSuggestions);

router.route('/advanced')
  .post(advancedSearch);

router.route('/popular')
  .get(getPopularSearches);

export default router;