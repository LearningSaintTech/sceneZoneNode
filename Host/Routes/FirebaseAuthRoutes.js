const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  sendFirebaseOtp,
  verifyFirebaseOtp,
  firebaseLogin,
} = require('../controllers/Auth/FirebaseAuthController');

router.post(
  '/firebase-signup',
  [
    body('mobileNumber').notEmpty().matches(/^\+\d{1,3}\d{9,15}$/),
    body('fullName').notEmpty().isString().trim(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('location').notEmpty().isString().trim(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  sendFirebaseOtp
);

router.post(
  '/firebase-verify-otp',
  [
    body('mobileNumber').notEmpty().matches(/^\+\d{1,3}\d{9,15}$/),
    body('idToken').notEmpty().isString(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  verifyFirebaseOtp
);

router.post(
  '/firebase-login',
  [
    body('mobileNumber').notEmpty().matches(/^\+\d{1,3}\d{9,15}$/),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  firebaseLogin
);

module.exports = router;