const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { studentAuth } = require('../middleware/authorization');
const {
  getStudentProfile,
  updateStudentProfile,
  getStudentCourses,
  getStudentCourseDetails,
  getStudentSchedule,
  getAllStudentGrades,
  getCourseWiseGrades,
  getStudentProgress
} = require('../controllers/studentModuleController');

router.use(authMiddleware);
router.use(studentAuth);

router.get('/profile', getStudentProfile);
router.put('/profile', updateStudentProfile);

router.get('/courses', getStudentCourses);
router.get('/courses/:courseId', getStudentCourseDetails);

router.get('/schedule', getStudentSchedule);

router.get('/grades', getAllStudentGrades);
router.get('/grades/course/:courseId', getCourseWiseGrades);

router.get('/progress', getStudentProgress);

module.exports = router;