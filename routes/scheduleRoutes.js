const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { adminMiddleware, teacherAuth } = require('../middleware/authorization');
const {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getWeeklySchedule
} = require('../controllers/scheduleController');

// Admin routes - mount at /api/v1/admin/schedules
router.use(authMiddleware, adminMiddleware);
router.get('/weekly', getWeeklySchedule);
router.route('/')
  .post(createSchedule)
  .get(getAllSchedules);
router.route('/:id')
  .get(getScheduleById)
  .put(updateSchedule)
  .delete(deleteSchedule);

module.exports = router;