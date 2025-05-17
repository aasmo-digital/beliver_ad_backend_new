// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  console.log("Incoming token:", token);


  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded); // <--- add this

    req.user = decoded;

    if (!req.user.id) {
      return res.status(400).json({ message: 'Invalid token structure. User ID missing.' });
    }

    next();
  } catch (error) {
    console.log("JWT Error:", error.message); // <--- add this

    return res.status(401).json({ message: 'Invalid token.' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. You are not an admin.' });
  }
  next();
};

const isSubAdmin = (req, res, next) => {
  if (req.user.role !== 'sub-admin') {
    return res.status(403).json({ message: 'Access denied. You are not a sub-admin.' });
  }
  next();
};

const isAdminOrSubAdmin = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'sub-admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Only admin or sub-admin can access.' });
};

module.exports = { authenticate, isAdmin, isSubAdmin, isAdminOrSubAdmin };
