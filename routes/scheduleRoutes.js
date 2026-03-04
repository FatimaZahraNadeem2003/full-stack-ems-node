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

router.use('/admin', authMiddleware, adminMiddleware);
router.get('/admin/weekly', getWeeklySchedule);
router.route('/admin')
  .post(createSchedule)
  .get(getAllSchedules);
router.route('/admin/:id')
  .get(getScheduleById)
  .put(updateSchedule)
  .delete(deleteSchedule);

router.use('/teacher', authMiddleware, teacherAuth);
router.get('/teacher/weekly', getWeeklySchedule);
router.get('/teacher', getAllSchedules);

module.exports = router;