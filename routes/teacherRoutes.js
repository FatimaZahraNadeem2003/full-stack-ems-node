const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { teacherAuth, adminMiddleware } = require('../middleware/authorization');
const {
  getTeacherDashboardStats,
  getTeacherCourses,
  getCourseDetails,
  getCourseStudents,
  addGrade,
  updateGrade,
  getCourseGrades,
  getStudentGrades,
  getTeacherSchedule,
  updateSchedule,
  addRemark,
  getStudentRemarks,
  getTeacherProfile,
  updateTeacherProfile
} = require('../controllers/teacherModuleController');

const {
  addTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeacherStats
} = require('../controllers/teacherController');

// Teacher-specific routes (require teacher authentication)
router.use(authMiddleware);
router.use(teacherAuth);

router.get('/dashboard/stats', getTeacherDashboardStats);

router.get('/courses', getTeacherCourses);
router.get('/courses/:courseId', getCourseDetails);
router.get('/courses/:courseId/students', getCourseStudents);

router.post('/grades', addGrade);
router.put('/grades/:id', updateGrade);
router.get('/grades/course/:courseId', getCourseGrades);
router.get('/grades/student/:studentId', getStudentGrades);

router.get('/schedules', getTeacherSchedule);
router.put('/schedules/:id', updateSchedule);

router.post('/remarks', addRemark);
router.get('/remarks/student/:studentId', getStudentRemarks);

router.get('/profile', getTeacherProfile);
router.put('/profile', updateTeacherProfile);

// Admin management routes (require admin authentication)
router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/', addTeacher);
router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);
router.get('/stats', getTeacherStats);

module.exports = router;