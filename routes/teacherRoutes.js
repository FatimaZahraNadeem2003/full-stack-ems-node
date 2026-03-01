const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { teacherAuth } = require('../middleware/authorization');
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
  getStudentRemarks
} = require('../controllers/teacherModuleController');

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

module.exports = router;