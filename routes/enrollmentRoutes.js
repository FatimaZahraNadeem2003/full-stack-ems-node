const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { adminMiddleware } = require('../middleware/authorization');
const { teacherAuth } = require('../middleware/authorization');
const { studentAuth } = require('../middleware/authorization');
const {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  getStudentCourses,
  bulkEnroll,
  selfEnroll,
  getStudentEnrollments
} = require('../controllers/enrollmentController');

// Apply authentication to all routes
router.use(authMiddleware);

// Admin enrollment routes
router.use('/admin', adminMiddleware);
router.post('/admin/bulk', bulkEnroll);
router.get('/admin/student/:studentId', getStudentCourses);
router.route('/admin')
  .post(createEnrollment)
  .get(getAllEnrollments);
router.route('/admin/:id')
  .get(getEnrollmentById)
  .put(updateEnrollment)
  .delete(deleteEnrollment);

// Teacher enrollment routes
router.use('/teacher', teacherAuth);
router.post('/teacher/enroll', createEnrollment);
router.delete('/teacher/enroll/:id', deleteEnrollment);
router.get('/teacher/my-enrollments', getAllEnrollments);

// Student enrollment routes
router.use('/student', studentAuth);
router.post('/student/enroll', selfEnroll);
router.get('/student/enrollments', getStudentEnrollments);
router.delete('/student/enrollments/:id', deleteEnrollment);

module.exports = router;