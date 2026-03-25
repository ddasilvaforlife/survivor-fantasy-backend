const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

// REGISTER - Create new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email or username already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, password_hash]
    );

    res.json({
      success: true,
      message: 'User created successfully!',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// LOGIN - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        email: user.email 
      },
      'survivor-secret-key-change-this-in-production', // You should use an environment variable for this!
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// VERIFY TOKEN - Check if user is logged in (bonus endpoint)
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Get token from "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, 'survivor-secret-key-change-this-in-production');
    
    res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
});

module.exports = router;