const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { sendWelcomeEmail } = require('../controllers/emailController');

const db = admin.firestore();

/**
 * Register a new user
 * POST /api/users/register
 */
router.post('/register', async (req, res) => {
  try {
    const { uid, email, name, phone } = req.body;

    // Validate required fields
    if (!uid || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: uid, email, name',
      });
    }

    // Check if user already exists
    const userDoc = await db.collection('users').doc(uid).get();

    if (userDoc.exists) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create user document
    const userData = {
      uid,
      email,
      name,
      phone: phone || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(uid).set(userData);

    console.log(`✅ User registered: ${uid}`);

    // Send welcome email
    try {
      await sendWelcomeEmail({
        email,
        name,
      });
      console.log(`📧 Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userData,
    });
  } catch (error) {
    console.error('❌ User registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message,
    });
  }
});

/**
 * Get user profile
 * GET /api/users/:uid
 */
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        uid,
        ...userDoc.data(),
      },
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message,
    });
  }
});

/**
 * Update user profile
 * PATCH /api/users/:uid
 */
router.patch('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;

    // Don't allow updating sensitive fields
    delete updates.uid;
    delete updates.createdAt;

    // Add updated timestamp
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await userRef.update(updates);

    console.log(`✅ User profile updated: ${uid}`);

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      user: {
        uid,
        ...userDoc.data(),
        ...updates,
      },
    });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile',
      error: error.message,
    });
  }
});

module.exports = router;
