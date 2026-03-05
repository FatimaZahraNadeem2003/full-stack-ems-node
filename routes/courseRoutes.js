const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { adminMiddleware } = require('../middleware/authorization');
const {
  validateCourse,
  validateAssignTeacher,
  validateCourseUpdate
} = require('../middleware/validation');
const {
  addCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  assignTeacher,
  getCourseStats
} = require('../controllers/courseController');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', getCourseStats);

router.post('/:courseId/assign-teacher', validateAssignTeacher, assignTeacher);

router.route('/')
  .post(validateCourse, addCourse)
  .get(getAllCourses);

router.route('/:id')
  .get(getCourseById)
  .put(validateCourseUpdate, updateCourse)
  .delete(deleteCourse);

module.exports = router;