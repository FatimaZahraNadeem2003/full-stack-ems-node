const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { teacherOrStudentAuth } = require('../middleware/authorization');
const {
  getBorrowedBooks,
  searchBooks,
  requestBook
} = require('../controllers/libraryController');

router.use(authMiddleware);
router.use(teacherOrStudentAuth);

router.get('/borrowed', getBorrowedBooks);
router.get('/search', searchBooks);
router.post('/request', requestBook);

module.exports = router;