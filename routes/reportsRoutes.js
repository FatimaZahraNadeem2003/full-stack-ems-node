const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { adminMiddleware } = require('../middleware/authorization');
const {
  getDashboardStats,
  getStudentsCount,
  getCoursesCount,
  getTodayClasses,
  getTeacherWorkload
} = require('../controllers/reportsController');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', getDashboardStats);
router.get('/students-count', getStudentsCount);
router.get('/courses-count', getCoursesCount);
router.get('/today-classes', getTodayClasses);
router.get('/teacher-workload', getTeacherWorkload);

module.exports = router;