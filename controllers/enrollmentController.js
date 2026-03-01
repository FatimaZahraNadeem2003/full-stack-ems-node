const { Enrollment, Student, Course, User } = require('../models');
const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

/**
 * @desc    Enroll student in course
 * @route   POST /api/admin/enrollments
 * @access  Private/Admin
 */
const createEnrollment = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      enrollmentDate,
      status,
      progress,
      grade,
      marksObtained,
      remarks
    } = req.body;

    const student = await Student.findById(studentId).populate({
      path: 'userId',
      select: 'firstName lastName email'
    });
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const existingEnrollment = await Enrollment.findOne({
      studentId,
      courseId,
      status: { $in: ['enrolled', 'completed'] }
    });

    if (existingEnrollment) {
      throw new BadRequestError('Student already enrolled in this course');
    }

    // Check course capacity
    const enrolledCount = await Enrollment.countDocuments({
      courseId,
      status: 'enrolled'
    });

    if (enrolledCount >= course.maxStudents) {
      throw new BadRequestError('Course has reached maximum capacity');
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      studentId,
      courseId,
      enrollmentDate: enrollmentDate || Date.now(),
      status: status || 'enrolled',
      progress: progress || 0,
      grade: grade || 'Not Graded',
      marksObtained,
      remarks
    });

    // Populate data
    await enrollment.populate([
      { 
        path: 'studentId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      },
      { path: 'courseId', select: 'name code credits department' }
    ]);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Student enrolled successfully',
      data: enrollment
    });
  } catch (error) {
    console.error('Create enrollment error:', error);
    throw error;
  }
};

/**
 * @desc    Get all enrollments
 * @route   GET /api/admin/enrollments
 * @access  Private/Admin
 */
const getAllEnrollments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      studentId,
      courseId,
      status,
      search
    } = req.query;

    // Build query
    const query = {};
    if (studentId) query.studentId = studentId;
    if (courseId) query.courseId = courseId;
    if (status) query.status = status;

    // If search query, find matching students first
    if (search) {
      const users = await User.find({
        role: 'student',
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const students = await Student.find({
        userId: { $in: users.map(u => u._id) }
      }).select('_id');

      if (students.length > 0) {
        query.studentId = { $in: students.map(s => s._id) };
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get enrollments with populated data
    const enrollments = await Enrollment.find(query)
      .populate([
        { 
          path: 'studentId',
          populate: {
            path: 'userId',
            select: 'firstName lastName email'
          }
        },
        { path: 'courseId', select: 'name code credits department teacherId' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enrollment.countDocuments(query);

    res.status(StatusCodes.OK).json({
      success: true,
      count: enrollments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: enrollments
    });
  } catch (error) {
    console.error('Get all enrollments error:', error);
    throw error;
  }
};

/**
 * @desc    Get enrollment by ID
 * @route   GET /api/admin/enrollments/:id
 * @access  Private/Admin
 */
const getEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id)
      .populate([
        { 
          path: 'studentId',
          populate: {
            path: 'userId',
            select: 'firstName lastName email'
          }
        },
        { 
          path: 'courseId',
          populate: {
            path: 'teacherId',
            populate: {
              path: 'userId',
              select: 'firstName lastName'
            }
          }
        }
      ]);

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    console.error('Get enrollment by id error:', error);
    throw error;
  }
};

/**
 * @desc    Update enrollment
 * @route   PUT /api/admin/enrollments/:id
 * @access  Private/Admin
 */
const updateEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    // If marking as completed, set completion date
    if (updateData.status === 'completed' && enrollment.status !== 'completed') {
      updateData.completionDate = Date.now();
    }

    // Update enrollment
    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { 
        path: 'studentId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      },
      { path: 'courseId', select: 'name code credits' }
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Enrollment updated successfully',
      data: updatedEnrollment
    });
  } catch (error) {
    console.error('Update enrollment error:', error);
    throw error;
  }
};

/**
 * @desc    Delete enrollment
 * @route   DELETE /api/admin/enrollments/:id
 * @access  Private/Admin
 */
const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    await enrollment.deleteOne();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Enrollment removed successfully'
    });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    throw error;
  }
};

/**
 * @desc    Get student's courses
 * @route   GET /api/admin/enrollments/student/:studentId
 * @access  Private/Admin
 */
const getStudentCourses = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status } = req.query;

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Build query
    const query = { studentId };
    if (status) query.status = status;

    // Get enrollments
    const enrollments = await Enrollment.find(query)
      .populate([
        { 
          path: 'courseId',
          populate: {
            path: 'teacherId',
            populate: {
              path: 'userId',
              select: 'firstName lastName'
            }
          }
        }
      ])
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter(e => e.status === 'completed').length;
    const inProgressCourses = enrollments.filter(e => e.status === 'enrolled').length;
    
    // Calculate average progress
    const avgProgress = enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / totalCourses || 0;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.fullName,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        },
        statistics: {
          totalCourses,
          completedCourses,
          inProgressCourses,
          averageProgress: Math.round(avgProgress)
        },
        courses: enrollments
      }
    });
  } catch (error) {
    console.error('Get student courses error:', error);
    throw error;
  }
};

/**
 * @desc    Bulk enroll students
 * @route   POST /api/admin/enrollments/bulk
 * @access  Private/Admin
 */
const bulkEnroll = async (req, res) => {
  try {
    const { courseId, studentIds } = req.body;

    if (!courseId || !studentIds || !Array.isArray(studentIds)) {
      throw new BadRequestError('Course ID and student IDs array are required');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const studentId of studentIds) {
      try {
        // Check if already enrolled
        const existing = await Enrollment.findOne({
          studentId,
          courseId,
          status: { $in: ['enrolled', 'completed'] }
        });

        if (existing) {
          results.failed.push({
            studentId,
            reason: 'Already enrolled'
          });
          continue;
        }

        // Check capacity
        const enrolledCount = await Enrollment.countDocuments({
          courseId,
          status: 'enrolled'
        });

        if (enrolledCount >= course.maxStudents) {
          results.failed.push({
            studentId,
            reason: 'Course full'
          });
          continue;
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
          studentId,
          courseId,
          status: 'enrolled'
        });

        results.successful.push({
          studentId,
          enrollmentId: enrollment._id
        });
      } catch (error) {
        results.failed.push({
          studentId,
          reason: error.message
        });
      }
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Bulk enrollment completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('Bulk enroll error:', error);
    throw error;
  }
};

module.exports = {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  getStudentCourses,
  bulkEnroll
};