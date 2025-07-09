const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const jwt = require('jsonwebtoken');

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Version history endpoint
router.get('/:roomId/versions', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ roomId: req.params.roomId });
    res.json(doc?.versions || []);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Restore version endpoint
router.post('/:roomId/restore', authMiddleware, async (req, res) => {
  try {
    const { versionIndex } = req.body;
    const doc = await Document.findOne({ roomId: req.params.roomId });
    
    if (!doc || !doc.versions[versionIndex]) {
      return res.status(404).json({ message: 'Version not found' });
    }

    doc.currentContent = doc.versions[versionIndex].content;
    await doc.save();
    res.json({ content: doc.currentContent });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;