const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth');
const { otpLimiter, loginLimiter } = require('../middlewares/rateLimiter');
const { 
  validate, 
  required, 
  email, 
  mobile, 
  pincode, 
  minLength, 
  inEnum 
} = require('../middlewares/validation');

const registerRules = {
  orgName: [required(), minLength(3)],
  orgType: [required(), inEnum(['Ganesh Mandal', 'Temple', 'Trust', 'NGO', 'Society', 'Club', 'Religious Organization', 'Community Organization'])],
  orgMobile: [required(), mobile()],
  orgEmail: [required(), email()],
  address: [required()],
  city: [required()],
  state: [required()],
  pincode: [required(), pincode()],
  upiId: [required()],
  adminName: [required(), minLength(3)],
  adminEmail: [required(), email()],
  adminMobile: [required(), mobile()],
  password: [required(), minLength(6)],
};

const loginRules = {
  email: [required(), email()],
  password: [required()],
};

const sendOtpRules = {
  mobile: [required(), mobile()],
};

const verifyOtpRules = {
  mobile: [required(), mobile()],
  otp: [required(), minLength(6)],
};

const tokenRules = {
  refreshToken: [required()],
};

router.post('/register-org', validate(registerRules), (req, res) => authController.register(req, res));
router.post('/login-email', loginLimiter, validate(loginRules), (req, res) => authController.login(req, res));
router.post('/send-otp', otpLimiter, validate(sendOtpRules), (req, res) => authController.sendOtp(req, res));
router.post('/verify-otp', loginLimiter, validate(verifyOtpRules), (req, res) => authController.verifyOtp(req, res));
router.post('/refresh', validate(tokenRules), (req, res) => authController.refresh(req, res));
router.post('/logout', validate(tokenRules), (req, res) => authController.logout(req, res));
router.get('/me', authenticateToken, (req, res) => authController.getMe(req, res));

module.exports = router;
