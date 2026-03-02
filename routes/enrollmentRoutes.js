const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { adminMiddleware } = require('../middleware/authorization');
const {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  getStudentCourses,
  bulkEnroll
} = require('../controllers/enrollmentController');

router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/bulk', bulkEnroll);
router.get('/student/:studentId', getStudentCourses);

router.route('/')
  .post(createEnrollment)
  .get(getAllEnrollments);

router.route('/:id')
  .get(getEnrollmentById)
  .put(updateEnrollment)
  .delete(deleteEnrollment);

module.exports = router;