import asyncHandler from 'express-async-handler';

const roleCheck = (roles) => asyncHandler(async (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error('Access denied: Insufficient permissions');
  }
  next();
});

export default roleCheck;