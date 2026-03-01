const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { teacherOrStudentAuth } = require('../middleware/authorization');
const {
  getMySchedule,
  getUpcomingEvents,
  markAttendance
} = require('../controllers/calendarController');

router.use(authMiddleware);
router.use(teacherOrStudentAuth);

router.get('/schedule', getMySchedule);
router.get('/events', getUpcomingEvents);
router.post('/attendance', markAttendance);

module.exports = router;