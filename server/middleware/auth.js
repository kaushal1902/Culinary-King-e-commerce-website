const jwt = require('jsonwebtoken');

function requireAuth(request, response, next) {
  const token = request.cookies.culinary_king_token;

  if (!token) {
    return response.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    request.userId = payload.userId;
    return next();
  } catch (error) {
    return response.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

function optionalAuth(request, response, next) {
  const token = request.cookies.culinary_king_token;
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    request.userId = payload.userId;
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }
  return next();
}

module.exports = { requireAuth, optionalAuth };
