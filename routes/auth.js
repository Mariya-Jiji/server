const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Booking = require('../models/Booking');
const authMiddleware = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.post('/register', upload.single('idProof'), async (req, res) => {
  try {
    const { name, email, password, role, serviceType, phone, location } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const userData = {
      name, email, password: hashed, role,
      serviceType: role === 'provider' ? serviceType : undefined,
      phone,
      idProof: req.file ? req.file.filename : null,
      status: role === 'customer' ? 'approved' : 'pending'
    };
    
    // Parse GPS location string to GeoJSON for providers (format: 'lat,lng')
    if (role === 'provider' && location) {
      const parts = location.trim().split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          userData.location = {
            type: 'Point',
            coordinates: [lng, lat]  // MongoDB: [longitude, latitude]
          };
        }
      }
    }
    
    const user = new User(userData);
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, isApproved: user.isApproved } });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid email or password' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Invalid email or password' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, isApproved: user.isApproved, status: user.status, notifications: user.notifications } });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Mark notification as read
router.put('/mark-notification-read', authMiddleware, async (req, res) => {
  try {
    const { index } = req.body;
    const user = await User.findById(req.user.id);
    if (user.notifications && user.notifications[index]) {
      user.notifications[index].read = true;
      await user.save();
      res.json({ msg: 'Notification marked as read' });
    } else {
      res.status(404).json({ msg: 'Notification not found' });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Email not found' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ msg: 'Password updated' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get current user data
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/upload-id', authMiddleware, upload.single('idProof'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { idProof: req.file?.filename, isApproved: false },
      { new: true }
    );
    res.json({ msg: 'ID proof uploaded' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Delete account
router.delete('/delete-account', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Remove related bookings
    await Booking.deleteMany({ $or: [{ customer: user._id }, { provider: user._id }] });

    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Favorites routes
router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favorites', 'name location phone rating reviewCount serviceType');
    res.json(user.favorites);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/favorites/:providerId', authMiddleware, async (req, res) => {
  try {
    const { providerId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user.favorites.includes(providerId)) {
      user.favorites.push(providerId);
      await user.save();
    }
    res.json({ msg: 'Added to favorites' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete('/favorites/:providerId', authMiddleware, async (req, res) => {
  try {
    const { providerId } = req.params;
    const user = await User.findById(req.user.id);
    user.favorites = user.favorites.filter(id => id.toString() !== providerId);
    await user.save();
    res.json({ msg: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;