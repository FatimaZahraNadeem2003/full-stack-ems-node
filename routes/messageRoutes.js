const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { teacherOrStudentAuth } = require('../middleware/authorization');
const {
  getMyMessages,
  sendMessage,
  deleteMessage
} = require('../controllers/messageController');

router.use(authMiddleware);
router.use(teacherOrStudentAuth);

router.get('/messages', getMyMessages);
router.post('/messages', sendMessage);
router.delete('/messages/:id', deleteMessage);

module.exports = router;