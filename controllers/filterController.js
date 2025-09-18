import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

// @desc    Get filter options
// @route   GET /api/filter/options
// @access  Public
export const getFilterOptions = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .select('name slug filters')
    .populate('parentCategory', 'name');

  // Get unique values for various filters from products
  const filterOptions = await Product.aggregate([
    { $match: { status: 'published' } },
    {
      $group: {
        _id: null,
        surfaceFinishes: { $addToSet: '$surfaceFinish' },
        roomTypes: { $addToSet: '$roomTypes' },
        applications: { $addToSet: '$applications' },
        minPrice: { $min: '$pricing.basePrice' },
        maxPrice: { $max: '$pricing.basePrice' },
        brands: { $addToSet: '$specifications.brand' },
        materialTypes: { $addToSet: '$specifications.materialType' },
        finishes: { $addToSet: '$specifications.finish' }
      }
    }
  ]);

  const options = filterOptions[0] || {};
  
  // Flatten arrays and remove null/empty values
  const processArray = (arr) => {
    return [...new Set(arr.flat().filter(item => item && item.trim() !== ''))].sort();
  };

  res.status(200).json({
    success: true,
    filterOptions: {
      categories,
      surfaceFinishes: processArray(options.surfaceFinishes || []),
      roomTypes: processArray(options.roomTypes || []),
      applications: processArray(options.applications || []),
      priceRange: {
        min: options.minPrice || 0,
        max: options.maxPrice || 10000
      },
      brands: processArray(options.brands || []),
      materialTypes: processArray(options.materialTypes || []),
      finishes: processArray(options.finishes || [])
    }
  });
});

// @desc    Filter products
// @route   POST /api/filter
// @access  Public
export const filterProducts = asyncHandler(async (req, res) => {
  const {
    category,
    subCategory,
    surfaceFinish,
    roomTypes,
    applications,
    minPrice,
    maxPrice,
    brands,
    materialTypes,
    finishes,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 12,
    search
  } = req.body;

  const skip = (page - 1) * limit;

  // Build filter query
  let filterQuery = { status: 'published' };

  if (category) {
    filterQuery.parentCategory = category;
  }

  if (subCategory) {
    filterQuery.subCategory = subCategory;
  }

  if (surfaceFinish) {
    filterQuery.surfaceFinish = surfaceFinish;
  }

  if (roomTypes && roomTypes.length > 0) {
    filterQuery.roomTypes = { $in: roomTypes };
  }

  if (applications && applications.length > 0) {
    filterQuery.applications = { $in: applications };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filterQuery['pricing.basePrice'] = {};
    if (minPrice !== undefined) filterQuery['pricing.basePrice'].$gte = parseFloat(minPrice);
    if (maxPrice !== undefined) filterQuery['pricing.basePrice'].$lte = parseFloat(maxPrice);
  }

  if (brands && brands.length > 0) {
    filterQuery['specifications.brand'] = { $in: brands };
  }

  if (materialTypes && materialTypes.length > 0) {
    filterQuery['specifications.materialType'] = { $in: materialTypes };
  }

  if (finishes && finishes.length > 0) {
    filterQuery['specifications.finish'] = { $in: finishes };
  }

  if (search) {
    filterQuery.$text = { $search: search };
  }

  // Build sort object
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const products = await Product.find(filterQuery)
    .populate('parentCategory', 'name slug')
    .populate('subCategory', 'name slug')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  const totalProducts = await Product.countDocuments(filterQuery);
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

// @desc    Get products by category
// @route   GET /api/filter/category/:categorySlug
// @access  Public
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { categorySlug } = req.params;
  const { page = 1, limit = 12 } = req.query;

  const skip = (page - 1) * limit;

  const category = await Category.findOne({ slug: categorySlug, isActive: true });
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  // Find all subcategories if it's a parent category
  let categoryFilter = {};
  if (!category.parentCategory) {
    const subCategories = await Category.find({ parentCategory: category._id, isActive: true });
    categoryFilter = { 
      $or: [
        { parentCategory: category._id },
        { subCategory: { $in: subCategories.map(cat => cat._id) } }
      ]
    };
  } else {
    categoryFilter = { 
      $or: [
        { parentCategory: category.parentCategory },
        { subCategory: category._id }
      ]
    };
  }

  const products = await Product.find({
    ...categoryFilter,
    status: 'published'
  })
    .populate('parentCategory', 'name slug')
    .populate('subCategory', 'name slug')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalProducts = await Product.countDocuments({
    ...categoryFilter,
    status: 'published'
  });
  const totalPages = Math.ceil(totalProducts / limit);

  res.status(200).json({
    success: true,
    category,
    products,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalProducts,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    }
  });
});