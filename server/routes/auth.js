const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const authCookieName = 'culinary_king_token';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' }
});

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

function setAuthCookie(response, userId) {
  const token = jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
  response.cookie(authCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

router.post('/signup', authLimiter, async (request, response, next) => {
  try {
    const { name, email, password } = request.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!name || name.trim().length < 2) {
      return response.status(400).json({ message: 'Please enter your full name.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return response.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return response.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return response.status(409).json({ message: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash });
    setAuthCookie(response, user._id);
    return response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', authLimiter, async (request, response, next) => {
  try {
    const { email, password } = request.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ message: 'Invalid email or password.' });
    }

    setAuthCookie(response, user._id);
    return response.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (request, response) => {
  response.clearCookie(authCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  return response.json({ message: 'You have been logged out.' });
});

router.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.userId).select('_id name email');
    if (!user) return response.status(401).json({ message: 'Account not found.' });
    return response.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
