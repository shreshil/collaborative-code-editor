const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Signup failed' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: false, // Use true only with HTTPS in production
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({ message: 'Login successful', user: { name: user.name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// GET LOGGED-IN USER
router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Not logged in' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ id: decoded.id, name: decoded.name });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax'
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

// View Routes
router.get('/login-page', (req, res) => {
  res.render('login');
});

router.get('/signup-page', (req, res) => {
  res.render('signup');
});

module.exports = router;