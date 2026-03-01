const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { adminMiddleware } = require('../middleware/authorization');
const {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getWeeklySchedule
} = require('../controllers/scheduleController');

// All routes require authentication and admin access
router.use(authMiddleware);
router.use(adminMiddleware);

// Weekly schedule route (must be before /:id)
router.get('/weekly', getWeeklySchedule);

// Schedule routes
router.route('/')
  .post(createSchedule)
  .get(getAllSchedules);

router.route('/:id')
  .get(getScheduleById)
  .put(updateSchedule)
  .delete(deleteSchedule);

module.exports = router;