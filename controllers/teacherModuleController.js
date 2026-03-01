const { Course, Teacher, User, Student, Enrollment, Grade, Schedule, Remark } = require('../models');
const { BadRequestError, NotFoundError, UnauthorizedError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

/**
 * @desc    Get teacher's assigned courses
 * @route   GET /api/teacher/courses
 * @access  Private/Teacher
 */
const getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.user.teacherId;

    const courses = await Course.find({ 
      teacherId,
      status: { $ne: 'completed' }
    })
    .select('name code description credits department level status')
    .sort({ createdAt: -1 });

    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const enrolledCount = await Enrollment.countDocuments({
          courseId: course._id,
          status: 'enrolled'
        });

        return {
          ...course.toObject(),
          enrolledCount
        };
      })
    );

    res.status(StatusCodes.OK).json({
      success: true,
      count: courses.length,
      data: coursesWithStats
    });
  } catch (error) {
    console.error('Get teacher courses error:', error);
    throw error;
  }
};

/**
 * @desc    Get enrolled students for a course
 * @route   GET /api/teacher/courses/:courseId/students
 * @access  Private/Teacher
 */
const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.teacherId;

    const course = await Course.findOne({ _id: courseId, teacherId });
    if (!course) {
      throw new UnauthorizedError('You are not authorized to view this course');
    }

    const enrollments = await Enrollment.find({ 
      courseId,
      status: { $in: ['enrolled', 'completed'] }
    })
    .populate({
      path: 'studentId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email'
      }
    })
    .sort({ createdAt: -1 });

    const students = enrollments.map(enrollment => ({
      enrollmentId: enrollment._id,
      studentId: enrollment.studentId._id,
      name: `${enrollment.studentId.userId.firstName} ${enrollment.studentId.userId.lastName}`,
      email: enrollment.studentId.userId.email,
      rollNumber: enrollment.studentId.rollNumber,
      class: enrollment.studentId.class,
      section: enrollment.studentId.section,
      enrollmentDate: enrollment.enrollmentDate,
      status: enrollment.status,
      progress: enrollment.progress
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      count: students.length,
      course: {
        id: course._id,
        name: course.name,
        code: course.code
      },
      data: students
    });
  } catch (error) {
    console.error('Get course students error:', error);
    throw error;
  }
};

/**
 * @desc    Add grade for student
 * @route   POST /api/teacher/grades
 * @access  Private/Teacher
 */
const addGrade = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      assessmentType,
      assessmentName,
      maxMarks,
      obtainedMarks,
      remarks
    } = req.body;

    const teacherId = req.user.teacherId;

    const course = await Course.findOne({ _id: courseId, teacherId });
    if (!course) {
      throw new UnauthorizedError('You are not authorized to grade this course');
    }

    const enrollment = await Enrollment.findOne({
      studentId,
      courseId,
      status: 'enrolled'
    });

    if (!enrollment) {
      throw new BadRequestError('Student is not enrolled in this course');
    }

    const grade = await Grade.create({
      studentId,
      courseId,
      teacherId,
      assessmentType,
      assessmentName,
      maxMarks,
      obtainedMarks,
      remarks
    });

    await grade.populate([
      {
        path: 'studentId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      },
      { path: 'courseId', select: 'name code' }
    ]);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Grade added successfully',
      data: grade
    });
  } catch (error) {
    console.error('Add grade error:', error);
    throw error;
  }
};

/**
 * @desc    Update grade
 * @route   PUT /api/teacher/grades/:id
 * @access  Private/Teacher
 */
const updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const teacherId = req.user.teacherId;

    const grade = await Grade.findById(id);
    if (!grade) {
      throw new NotFoundError('Grade not found');
    }

    if (grade.teacherId.toString() !== teacherId) {
      throw new UnauthorizedError('You are not authorized to update this grade');
    }

    const updatedGrade = await Grade.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      {
        path: 'studentId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      },
      { path: 'courseId', select: 'name code' }
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Grade updated successfully',
      data: updatedGrade
    });
  } catch (error) {
    console.error('Update grade error:', error);
    throw error;
  }
};

/**
 * @desc    Get all grades for a course
 * @route   GET /api/teacher/grades/course/:courseId
 * @access  Private/Teacher
 */
const getCourseGrades = async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.teacherId;

    const course = await Course.findOne({ _id: courseId, teacherId });
    if (!course) {
      throw new UnauthorizedError('You are not authorized to view this course');
    }

    const grades = await Grade.find({ courseId })
      .populate({
        path: 'studentId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      })
      .sort({ createdAt: -1 });

    const studentsMap = new Map();
    grades.forEach(grade => {
      const studentId = grade.studentId._id.toString();
      if (!studentsMap.has(studentId)) {
        studentsMap.set(studentId, {
          student: {
            id: studentId,
            name: `${grade.studentId.userId.firstName} ${grade.studentId.userId.lastName}`,
            rollNumber: grade.studentId.rollNumber
          },
          grades: []
        });
      }
      studentsMap.get(studentId).grades.push({
        id: grade._id,
        assessmentType: grade.assessmentType,
        assessmentName: grade.assessmentName,
        maxMarks: grade.maxMarks,
        obtainedMarks: grade.obtainedMarks,
        percentage: grade.percentage,
        grade: grade.grade,
        remarks: grade.remarks,
        submittedAt: grade.submittedAt
      });
    });

    const result = Array.from(studentsMap.values());

    res.status(StatusCodes.OK).json({
      success: true,
      course: {
        id: course._id,
        name: course.name,
        code: course.code
      },
      totalStudents: result.length,
      data: result
    });
  } catch (error) {
    console.error('Get course grades error:', error);
    throw error;
  }
};

/**
 * @desc    Get student's grades
 * @route   GET /api/teacher/grades/student/:studentId
 * @access  Private/Teacher
 */
const getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user.teacherId;

    const teacherCourses = await Course.find({ teacherId }).distinct('_id');

    const grades = await Grade.find({
      studentId,
      courseId: { $in: teacherCourses }
    })
    .populate([
      { path: 'courseId', select: 'name code credits' },
      {
        path: 'studentId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      }
    ])
    .sort({ createdAt: -1 });

    const totalGrades = grades.length;
    const averagePercentage = grades.reduce((acc, g) => acc + g.percentage, 0) / totalGrades || 0;

    const byCourse = grades.reduce((acc, grade) => {
      const courseId = grade.courseId._id.toString();
      if (!acc[courseId]) {
        acc[courseId] = {
          course: {
            id: courseId,
            name: grade.courseId.name,
            code: grade.courseId.code
          },
          grades: []
        };
      }
      acc[courseId].grades.push({
        assessmentType: grade.assessmentType,
        assessmentName: grade.assessmentName,
        maxMarks: grade.maxMarks,
        obtainedMarks: grade.obtainedMarks,
        percentage: grade.percentage,
        grade: grade.grade,
        submittedAt: grade.submittedAt
      });
      return acc;
    }, {});

    res.status(StatusCodes.OK).json({
      success: true,
      student: grades[0] ? {
        id: grades[0].studentId._id,
        name: `${grades[0].studentId.userId.firstName} ${grades[0].studentId.userId.lastName}`,
        rollNumber: grades[0].studentId.rollNumber
      } : null,
      statistics: {
        totalGrades,
        averagePercentage: averagePercentage.toFixed(1),
        totalCourses: Object.keys(byCourse).length
      },
      data: Object.values(byCourse)
    });
  } catch (error) {
    console.error('Get student grades error:', error);
    throw error;
  }
};

/**
 * @desc    Get teacher's schedule
 * @route   GET /api/teacher/schedules
 * @access  Private/Teacher
 */
const getTeacherSchedule = async (req, res) => {
  try {
    const teacherId = req.user.teacherId;
    const { weekStart } = req.query;

    const query = { teacherId, status: 'scheduled' };
    

    const schedules = await Schedule.find(query)
      .populate({
        path: 'courseId',
        select: 'name code credits'
      })
      .sort({ dayOfWeek: 1, startTime: 1 });

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const groupedSchedule = days.reduce((acc, day) => {
      acc[day] = schedules.filter(s => s.dayOfWeek === day);
      return acc;
    }, {});

    res.status(StatusCodes.OK).json({
      success: true,
      totalClasses: schedules.length,
      data: groupedSchedule
    });
  } catch (error) {
    console.error('Get teacher schedule error:', error);
    throw error;
  }
};

/**
 * @desc    Update schedule (if allowed)
 * @route   PUT /api/teacher/schedules/:id
 * @access  Private/Teacher
 */
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const teacherId = req.user.teacherId;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    if (schedule.teacherId.toString() !== teacherId) {
      throw new UnauthorizedError('You are not authorized to update this schedule');
    }

    const allowedUpdates = {
      status: updateData.status,
      room: updateData.room,
      ...(updateData.status === 'cancelled' ? { status: 'cancelled' } : {})
    };

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      allowedUpdates,
      { new: true, runValidators: true }
    ).populate({
      path: 'courseId',
      select: 'name code'
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Schedule updated successfully',
      data: updatedSchedule
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    throw error;
  }
};

/**
 * @desc    Add remark for student
 * @route   POST /api/teacher/remarks
 * @access  Private/Teacher
 */
const addRemark = async (req, res) => {
  try {
    const { studentId, courseId, remark } = req.body;
    const teacherId = req.user.teacherId;

    const student = await Student.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (courseId) {
      const course = await Course.findOne({ _id: courseId, teacherId });
      if (!course) {
        throw new UnauthorizedError('You are not authorized to add remark for this course');
      }
    }

    const newRemark = await Remark.create({
      studentId,
      teacherId,
      courseId,
      remark,
      createdBy: req.user.userId
    });

    await newRemark.populate([
      {
        path: 'studentId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      },
      {
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      },
      { path: 'courseId', select: 'name code' }
    ]);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Remark added successfully',
      data: newRemark
    });
  } catch (error) {
    console.error('Add remark error:', error);
    throw error;
  }
};

/**
 * @desc    Get student's remarks
 * @route   GET /api/teacher/remarks/student/:studentId
 * @access  Private/Teacher
 */
const getStudentRemarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user.teacherId;

    const remarks = await Remark.find({ studentId })
      .populate([
        {
          path: 'teacherId',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        },
        { path: 'courseId', select: 'name code' }
      ])
      .sort({ createdAt: -1 });

    // Get student info
    const student = await Student.findById(studentId).populate({
      path: 'userId',
      select: 'firstName lastName'
    });

    res.status(StatusCodes.OK).json({
      success: true,
      student: student ? {
        id: student._id,
        name: `${student.userId.firstName} ${student.userId.lastName}`,
        rollNumber: student.rollNumber,
        class: student.class
      } : null,
      count: remarks.length,
      data: remarks
    });
  } catch (error) {
    console.error('Get student remarks error:', error);
    throw error;
  }
};

module.exports = {
  getTeacherCourses,
  getCourseStudents,
  addGrade,
  updateGrade,
  getCourseGrades,
  getStudentGrades,
  getTeacherSchedule,
  updateSchedule,
  addRemark,
  getStudentRemarks
};