const { Enrollment, Student, Course, User } = require('../models');
const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

const resolveStudentId = async (studentIdentifier) => {
  if (!studentIdentifier) return null;
  const isValidObjectId = studentIdentifier.match(/^[0-9a-fA-F]{24}$/);
  if (isValidObjectId) {
    return studentIdentifier;
  } else {
    const student = await Student.findOne({ 
      $or: [
        { rollNumber: studentIdentifier },
        { 'userId.email': studentIdentifier }
      ]
    }).populate('userId');
    return student?._id;
  }
};

const resolveCourseId = async (courseIdentifier) => {
  if (!courseIdentifier) return null;
  const isValidObjectId = courseIdentifier.match(/^[0-9a-fA-F]{24}$/);
  if (isValidObjectId) {
    return courseIdentifier;
  } else {
    const course = await Course.findOne({ 
      $or: [
        { code: courseIdentifier },
        { name: { $regex: courseIdentifier, $options: 'i' } }
      ]
    });
    return course?._id;
  }
};

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

    const enrolledCount = await Enrollment.countDocuments({
      courseId,
      status: 'enrolled'
    });

    if (enrolledCount >= course.maxStudents) {
      throw new BadRequestError('Course has reached maximum capacity');
    }

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

    const query = {};
    if (status) query.status = status;

    if (studentId) {
      const resolvedStudentId = await resolveStudentId(studentId);
      if (resolvedStudentId) {
        query.studentId = resolvedStudentId;
      } else {
        return res.status(StatusCodes.OK).json({
          success: true,
          count: 0,
          total: 0,
          page: parseInt(page),
          pages: 0,
          data: []
        });
      }
    }

    if (courseId) {
      const resolvedCourseId = await resolveCourseId(courseId);
      if (resolvedCourseId) {
        query.courseId = resolvedCourseId;
      } else {
        return res.status(StatusCodes.OK).json({
          success: true,
          count: 0,
          total: 0,
          page: parseInt(page),
          pages: 0,
          data: []
        });
      }
    }

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

    const skip = (parseInt(page) - 1) * parseInt(limit);

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

const updateEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    if (updateData.status === 'completed' && enrollment.status !== 'completed') {
      updateData.completionDate = Date.now();
    }

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

const getStudentCourses = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status } = req.query;

    const resolvedStudentId = await resolveStudentId(studentId);
    if (!resolvedStudentId) {
      throw new NotFoundError('Student not found');
    }

    const student = await Student.findById(resolvedStudentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const query = { studentId: resolvedStudentId };
    if (status) query.status = status;

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

    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter(e => e.status === 'completed').length;
    const inProgressCourses = enrollments.filter(e => e.status === 'enrolled').length;
    
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

const bulkEnroll = async (req, res) => {
  try {
    const { courseId, studentIds } = req.body;

    if (!courseId || !studentIds || !Array.isArray(studentIds)) {
      throw new BadRequestError('Course ID and student IDs array are required');
    }

    const resolvedCourseId = await resolveCourseId(courseId);
    if (!resolvedCourseId) {
      throw new NotFoundError('Course not found');
    }

    const course = await Course.findById(resolvedCourseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const studentIdentifier of studentIds) {
      try {
        const resolvedStudentId = await resolveStudentId(studentIdentifier);
        if (!resolvedStudentId) {
          results.failed.push({
            studentId: studentIdentifier,
            reason: 'Student not found'
          });
          continue;
        }

        const existing = await Enrollment.findOne({
          studentId: resolvedStudentId,
          courseId: resolvedCourseId,
          status: { $in: ['enrolled', 'completed'] }
        });

        if (existing) {
          results.failed.push({
            studentId: studentIdentifier,
            reason: 'Already enrolled'
          });
          continue;
        }

        const enrolledCount = await Enrollment.countDocuments({
          courseId: resolvedCourseId,
          status: 'enrolled'
        });

        if (enrolledCount >= course.maxStudents) {
          results.failed.push({
            studentId: studentIdentifier,
            reason: 'Course full'
          });
          continue;
        }

        const enrollment = await Enrollment.create({
          studentId: resolvedStudentId,
          courseId: resolvedCourseId,
          status: 'enrolled'
        });

        results.successful.push({
          studentId: studentIdentifier,
          enrollmentId: enrollment._id
        });
      } catch (error) {
        results.failed.push({
          studentId: studentIdentifier,
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

const selfEnroll = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const { courseId } = req.body;

    if (!courseId) {
      throw new BadRequestError('Course ID is required');
    }

    const resolvedCourseId = await resolveCourseId(courseId);
    if (!resolvedCourseId) {
      throw new NotFoundError('Course not found');
    }

    const student = await Student.findById(studentId).populate({
      path: 'userId',
      select: 'firstName lastName email'
    });
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const course = await Course.findById(resolvedCourseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const existingEnrollment = await Enrollment.findOne({
      studentId,
      courseId: resolvedCourseId,
      status: { $in: ['enrolled', 'completed'] }
    });

    if (existingEnrollment) {
      throw new BadRequestError('You are already enrolled in this course');
    }

    const enrolledCount = await Enrollment.countDocuments({
      courseId: resolvedCourseId,
      status: 'enrolled'
    });

    if (enrolledCount >= course.maxStudents) {
      throw new BadRequestError('Course has reached maximum capacity');
    }

    const enrollment = await Enrollment.create({
      studentId,
      courseId: resolvedCourseId,
      enrollmentDate: Date.now(),
      status: 'enrolled',
      progress: 0
    });

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
      message: 'Successfully enrolled in course',
      data: enrollment
    });
  } catch (error) {
    console.error('Self enrollment error:', error);
    throw error;
  }
};

const getStudentEnrollments = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const { status } = req.query;

    const query = { studentId };
    if (status) query.status = status;

    const enrollments = await Enrollment.find(query)
      .populate([
        { path: 'courseId', select: 'name code credits department' },
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

    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter(e => e.status === 'completed').length;
    const inProgressCourses = enrollments.filter(e => e.status === 'enrolled').length;
    
    const avgProgress = enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / totalCourses || 0;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        statistics: {
          totalCourses,
          completedCourses,
          inProgressCourses,
          averageProgress: Math.round(avgProgress)
        },
        enrollments
      }
    });
  } catch (error) {
    console.error('Get student enrollments error:', error);
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
  bulkEnroll,
  selfEnroll,
  getStudentEnrollments
};