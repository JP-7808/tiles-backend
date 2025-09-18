import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

// @desc    Search products
// @route   GET /api/search
// @access  Public
export const searchProducts = asyncHandler(async (req, res) => {
  const { 
    q, 
    page = 1, 
    limit = 12, 
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ message: 'Search query is required' });
  }

  const skip = (page - 1) * limit;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Text search with additional filters
  const searchQuery = {
    $text: { $search: q },
    status: 'published'
  };

  const products = await Product.find(searchQuery)
    .populate('parentCategory', 'name slug')
    .populate('subCategory', 'name slug')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  const totalProducts = await Product.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalProducts / limit);

  // Get search suggestions
  const suggestions = await Product.find(searchQuery)
    .select('name slug')
    .limit(5);

  res.status(200).json({
    success: true,
    query: q,
    products,
    suggestions,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalProducts,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    }
  });
});

// @desc    Get search suggestions
// @route   GET /api/search/suggestions
// @access  Public
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.status(200).json({
      success: true,
      suggestions: []
    });
  }

  // Search in products
  const productSuggestions = await Product.find({
    $text: { $search: q },
    status: 'published'
  })
    .select('name slug images pricing ratings')
    .limit(5);

  // Search in categories
  const categorySuggestions = await Category.find({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ],
    isActive: true
  })
    .select('name slug')
    .limit(3);

  res.status(200).json({
    success: true,
    suggestions: {
      products: productSuggestions,
      categories: categorySuggestions
    }
  });
});

// @desc    Advanced search with filters
// @route   POST /api/search/advanced
// @access  Public
export const advancedSearch = asyncHandler(async (req, res) => {
  const {
    query,
    category,
    minPrice,
    maxPrice,
    surfaceFinish,
    roomTypes,
    brands,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 12
  } = req.body;

  const skip = (page - 1) * limit;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Build search query
  let searchQuery = { status: 'published' };

  if (query && query.trim() !== '') {
    searchQuery.$text = { $search: query };
  }

  if (category) {
    searchQuery.parentCategory = category;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    searchQuery['pricing.basePrice'] = {};
    if (minPrice !== undefined) searchQuery['pricing.basePrice'].$gte = parseFloat(minPrice);
    if (maxPrice !== undefined) searchQuery['pricing.basePrice'].$lte = parseFloat(maxPrice);
  }

  if (surfaceFinish) {
    searchQuery.surfaceFinish = surfaceFinish;
  }

  if (roomTypes && roomTypes.length > 0) {
    searchQuery.roomTypes = { $in: roomTypes };
  }

  if (brands && brands.length > 0) {
    searchQuery['specifications.brand'] = { $in: brands };
  }

  const products = await Product.find(searchQuery)
    .populate('parentCategory', 'name slug')
    .populate('subCategory', 'name slug')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  const totalProducts = await Product.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalProducts / limit);

  res.status(200).json({
    success: true,
    products,
    pagination: {
      currentPage: page,
      totalPages,
      totalProducts,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    filters: req.body
  });
});

// @desc    Get popular searches
// @route   GET /api/search/popular
// @access  Public
export const getPopularSearches = asyncHandler(async (req, res) => {
  // In a real application, you might track search queries and return the most popular ones
  // For now, returning some sample popular searches
  const popularSearches = [
    'ceramic tiles',
    'bathroom tiles',
    'kitchen tiles',
    'marble flooring',
    'wall tiles',
    'outdoor tiles',
    'mosaic tiles'
  ];

  res.status(200).json({
    success: true,
    popularSearches
  });
});