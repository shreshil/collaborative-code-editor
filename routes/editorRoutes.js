const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Render editor page
router.get('/', authMiddleware, (req, res) => {
  res.render('editor', { name: req.user.name });
});

module.exports = router;