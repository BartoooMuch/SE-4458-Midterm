/**
 * Pagination middleware
 * Extracts page and limit from query params and adds to request
 */
const pagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Validate page and limit
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page number must be greater than 0.'
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100.'
    });
  }

  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit
  };

  next();
};

module.exports = pagination;

