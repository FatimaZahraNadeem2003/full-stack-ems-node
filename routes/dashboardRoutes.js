const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { teacherOrStudentAuth } = require('../middleware/authorization');
const { adminMiddleware } = require('../middleware/authorization');
const {
  getDashboardStats,
  getRecentActivity,
  getAnnouncements
} = require('../controllers/dashboardController');

router.use(authMiddleware);
// Allow access for admin, teacher, or student
router.use((req, res, next) => {
  const role = req.user.role;
  if (role === 'admin' || role === 'teacher' || role === 'student') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin, teacher, or student role required.'
    });
  }
});

router.get('/stats', getDashboardStats);
router.get('/recent-activity', getRecentActivity);
router.get('/announcements', getAnnouncements);

module.exports = router;