const { body, validationResult } = require('express-validator');
const { BadRequestError } = require('../errors');

const validateStudent = [
  body('firstName').notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  
  body('lastName').notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  
  body('email').isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('class').notEmpty().withMessage('Class is required'),
  
  body('contactNumber').optional().isMobilePhone().withMessage('Valid contact number required'),
  
  body('rollNumber').optional().isAlphanumeric().withMessage('Roll number must be alphanumeric'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }
    next();
  }
];

const validateTeacher = [
  body('firstName').notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  
  body('lastName').notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  
  body('email').isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('employeeId').notEmpty().withMessage('Employee ID is required')
    .isAlphanumeric().withMessage('Employee ID must be alphanumeric'),
  
  body('qualification').notEmpty().withMessage('Qualification is required'),
  
  body('specialization').notEmpty().withMessage('Specialization is required'),
  
  body('contactNumber').notEmpty().withMessage('Contact number is required')
    .isMobilePhone().withMessage('Valid contact number required'),
  
  body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a positive number'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }
    next();
  }
];

const validateCourse = [
  body('name').notEmpty().withMessage('Course name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Course name must be 3-100 characters'),
  
  body('code').notEmpty().withMessage('Course code is required')
    .isLength({ min: 2, max: 20 }).withMessage('Course code must be 2-20 characters')
    .isAlphanumeric().withMessage('Course code must be alphanumeric')
    .toUpperCase(),
  
  body('description').notEmpty().withMessage('Course description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  
  body('teacherId').optional().isMongoId().withMessage('Invalid teacher ID format'),
  
  body('credits').notEmpty().withMessage('Credits are required')
    .isInt({ min: 1, max: 6 }).withMessage('Credits must be between 1 and 6'),
  
  body('duration').notEmpty().withMessage('Duration is required')
    .isLength({ min: 2, max: 50 }).withMessage('Duration must be 2-50 characters'),
  
  body('department').notEmpty().withMessage('Department is required')
    .isLength({ min: 2, max: 50 }).withMessage('Department must be 2-50 characters'),
  
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Level must be beginner, intermediate, or advanced'),
  
  body('syllabus').optional().isURL().withMessage('Syllabus must be a valid URL'),
  
  body('prerequisites').optional().isArray().withMessage('Prerequisites must be an array'),
  
  body('prerequisites.*').optional().isString().withMessage('Each prerequisite must be a string'),
  
  body('maxStudents').optional().isInt({ min: 1, max: 500 })
    .withMessage('Max students must be between 1 and 500'),
  
  body('status').optional().isIn(['active', 'inactive', 'upcoming', 'completed'])
    .withMessage('Status must be active, inactive, upcoming, or completed'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }
    next();
  }
];

const validateAssignTeacher = [
  body('teacherId').notEmpty().withMessage('Teacher ID is required')
    .isMongoId().withMessage('Invalid teacher ID format'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }
    next();
  }
];

const validateCourseUpdate = [
  body('name').optional().isLength({ min: 3, max: 100 })
    .withMessage('Course name must be 3-100 characters'),
  
  body('code').optional().isLength({ min: 2, max: 20 })
    .withMessage('Course code must be 2-20 characters')
    .isAlphanumeric().withMessage('Course code must be alphanumeric')
    .toUpperCase(),
  
  body('description').optional().isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  
  body('teacherId').optional().isMongoId().withMessage('Invalid teacher ID format'),
  
  body('credits').optional().isInt({ min: 1, max: 6 })
    .withMessage('Credits must be between 1 and 6'),
  
  body('duration').optional().isLength({ min: 2, max: 50 })
    .withMessage('Duration must be 2-50 characters'),
  
  body('department').optional().isLength({ min: 2, max: 50 })
    .withMessage('Department must be 2-50 characters'),
  
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Level must be beginner, intermediate, or advanced'),
  
  body('syllabus').optional().isURL().withMessage('Syllabus must be a valid URL'),
  
  body('prerequisites').optional().isArray().withMessage('Prerequisites must be an array'),
  
  body('prerequisites.*').optional().isString().withMessage('Each prerequisite must be a string'),
  
  body('maxStudents').optional().isInt({ min: 1, max: 500 })
    .withMessage('Max students must be between 1 and 500'),
  
  body('status').optional().isIn(['active', 'inactive', 'upcoming', 'completed'])
    .withMessage('Status must be active, inactive, upcoming, or completed'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }
    next();
  }
];

const validateSchedule = [
  body('courseId').notEmpty().withMessage('Course ID is required')
    .isMongoId().withMessage('Invalid course ID format'),
  
  body('teacherId').notEmpty().withMessage('Teacher ID is required')
    .isMongoId().withMessage('Invalid teacher ID format'),
  
  body('dayOfWeek').notEmpty().withMessage('Day of week is required')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day of week'),
  
  body('startTime').notEmpty().withMessage('Start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  
  body('endTime').notEmpty().withMessage('End time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)')
    .custom((value, { req }) => {
      if (value <= req.body.startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('room').notEmpty().withMessage('Room is required')
    .isLength({ min: 2, max: 20 }).withMessage('Room must be 2-20 characters'),
  
  body('building').optional().isLength({ min: 2, max: 50 })
    .withMessage('Building must be 2-50 characters'),
  
  body('semester').notEmpty().withMessage('Semester is required'),
  
  body('academicYear').notEmpty().withMessage('Academic year is required'),
  
  body('isRecurring').optional().isBoolean().withMessage('isRecurring must be boolean'),
  
  body('status').optional().isIn(['scheduled', 'cancelled', 'completed'])
    .withMessage('Status must be scheduled, cancelled, or completed'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }
    next();
  }
];

const validateEnrollment = [
  body('studentId').notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID format'),
  
  body('courseId').notEmpty().withMessage('Course ID is required')
    .isMongoId().withMessage('Invalid course ID format'),
  
  body('status').optional().isIn(['enrolled', 'dropped', 'completed', 'pending'])
    .withMessage('Invalid status'),
  
  body('progress').optional().isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  
  body('grade').optional().isIn(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F', 'Incomplete', 'Not Graded'])
    .withMessage('Invalid grade'),
  
  body('marksObtained').optional().isInt({ min: 0, max: 100 })
    .withMessage('Marks must be between 0 and 100'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }
    next();
  }
];

const validateBulkEnroll = [
  body('courseId').notEmpty().withMessage('Course ID is required')
    .isMongoId().withMessage('Invalid course ID format'),
  
  body('studentIds').isArray().withMessage('Student IDs must be an array')
    .notEmpty().withMessage('Student IDs array cannot be empty'),
  
  body('studentIds.*').isMongoId().withMessage('Invalid student ID format in array'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }
    next();
  }
];

module.exports = {
  validateStudent,
  validateTeacher,
  validateCourse,
  validateCourseUpdate,
  validateAssignTeacher,
  validateSchedule,
  validateEnrollment,
  validateBulkEnroll
};