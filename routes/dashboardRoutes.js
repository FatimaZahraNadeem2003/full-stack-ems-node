const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { teacherOrStudentAuth } = require('../middleware/authorization');
const {
  getDashboardStats,
  getRecentActivity,
  getAnnouncements
} = require('../controllers/dashboardController');

router.use(authMiddleware);
router.use(teacherOrStudentAuth);

router.get('/stats', getDashboardStats);
router.get('/recent-activity', getRecentActivity);
router.get('/announcements', getAnnouncements);

module.exports = router;