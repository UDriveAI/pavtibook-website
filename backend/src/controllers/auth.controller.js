const authService = require('../services/auth.service');

class AuthController {
  async register(req, res) {
    try {
      const result = await authService.registerOrg(req.body);
      res.status(201).json({
        message: 'Organization and admin account created successfully.',
        ...result
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: error.message || 'Error creating organization.' });
    }
  }

  async login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      const result = await authService.loginEmail(email, password);
      res.json(result);
    } catch (error) {
      console.error('Email login error:', error);
      res.status(401).json({ message: error.message || 'Authentication failed.' });
    }
  }

  async sendOtp(req, res) {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: 'Mobile number is required.' });
    }

    try {
      await authService.sendOtp(mobile);
      res.json({ message: 'OTP sent successfully.' });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(400).json({ message: error.message || 'Error sending OTP.' });
    }
  }

  async verifyOtp(req, res) {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ message: 'Mobile number and OTP are required.' });
    }

    try {
      const result = await authService.verifyOtp(mobile, otp);
      res.json(result);
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(400).json({ message: error.message || 'OTP verification failed.' });
    }
  }

  async refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required.' });
    }

    try {
      const result = await authService.rotateRefreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({ message: error.message || 'Invalid refresh token.' });
    }
  }

  async logout(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required.' });
    }

    try {
      await authService.revokeRefreshToken(refreshToken);
      res.json({ message: 'Session logged out and token revoked successfully.' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(400).json({ message: error.message || 'Error processing logout request.' });
    }
  }

  async getMe(req, res) {
    try {
      const info = await authService.getMe(req.user.id);
      res.json(info);
    } catch (error) {
      console.error('Get user info error:', error);
      res.status(500).json({ message: error.message || 'Server error fetching profile details.' });
    }
  }
}

module.exports = new AuthController();
