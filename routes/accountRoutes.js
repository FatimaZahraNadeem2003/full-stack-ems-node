const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { teacherOrStudentAuth } = require('../middleware/authorization');
const {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getMyNotifications
} = require('../controllers/accountController');

router.use(authMiddleware);
router.use(teacherOrStudentAuth);

router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
router.put('/change-password', changePassword);
router.get('/notifications', getMyNotifications);

module.exports = router;