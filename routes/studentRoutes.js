const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { studentAuth, adminMiddleware } = require('../middleware/authorization');
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

const {
  addStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');

// Student-specific routes (require student authentication)
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

// Admin management routes (require admin authentication)
router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/', addStudent);
router.get('/', getAllStudents);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;