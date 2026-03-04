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

router.get('/dashboard/stats', authMiddleware, teacherAuth, getTeacherDashboardStats);

router.get('/courses', authMiddleware, teacherAuth, getTeacherCourses);
router.get('/courses/:courseId', authMiddleware, teacherAuth, getCourseDetails);
router.get('/courses/:courseId/students', authMiddleware, teacherAuth, getCourseStudents);

router.post('/grades', authMiddleware, teacherAuth, addGrade);
router.put('/grades/:id', authMiddleware, teacherAuth, updateGrade);
router.get('/grades/course/:courseId', authMiddleware, teacherAuth, getCourseGrades);
router.get('/grades/student/:studentId', authMiddleware, teacherAuth, getStudentGrades);

router.get('/schedules', authMiddleware, teacherAuth, getTeacherSchedule);
router.put('/schedules/:id', authMiddleware, teacherAuth, updateSchedule);

router.post('/remarks', authMiddleware, teacherAuth, addRemark);
router.get('/remarks/student/:studentId', authMiddleware, teacherAuth, getStudentRemarks);

router.get('/profile', authMiddleware, teacherAuth, getTeacherProfile);
router.put('/profile', authMiddleware, teacherAuth, updateTeacherProfile);

router.post('/', authMiddleware, adminMiddleware, addTeacher);
router.get('/', authMiddleware, adminMiddleware, getAllTeachers);
router.get('/:id', authMiddleware, adminMiddleware, getTeacherById);
router.put('/:id', authMiddleware, adminMiddleware, updateTeacher);
router.delete('/:id', authMiddleware, adminMiddleware, deleteTeacher);
router.get('/stats', authMiddleware, adminMiddleware, getTeacherStats);

module.exports = router;