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
  getStudentProgress,
  getAvailableCourses,  
  enrollInCourse,
  changePassword        
} = require('../controllers/studentModuleController');

const {
  addStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');

router.get('/profile', authMiddleware, studentAuth, getStudentProfile);
router.put('/profile', authMiddleware, studentAuth, updateStudentProfile);

router.put('/change-password', authMiddleware, studentAuth, changePassword);

router.get('/courses/available', authMiddleware, studentAuth, getAvailableCourses);
router.get('/courses', authMiddleware, studentAuth, getStudentCourses);
router.post('/enroll', authMiddleware, studentAuth, enrollInCourse);

router.get('/schedule', authMiddleware, studentAuth, getStudentSchedule);
router.get('/grades', authMiddleware, studentAuth, getAllStudentGrades);
router.get('/progress', authMiddleware, studentAuth, getStudentProgress);

router.get('/courses/:courseId', authMiddleware, studentAuth, getStudentCourseDetails);
router.get('/grades/course/:courseId', authMiddleware, studentAuth, getCourseWiseGrades);

router.post('/', authMiddleware, adminMiddleware, addStudent);
router.get('/', authMiddleware, adminMiddleware, getAllStudents);
router.get('/:id', authMiddleware, adminMiddleware, getStudentById);
router.put('/:id', authMiddleware, adminMiddleware, updateStudent);
router.delete('/:id', authMiddleware, adminMiddleware, deleteStudent);

module.exports = router;