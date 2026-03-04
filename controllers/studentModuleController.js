const { Student, User, Course, Enrollment, Grade, Schedule } = require('../models');
const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.studentId;

    const student = await Student.findById(studentId)
      .populate({
        path: 'userId',
        select: '-password'
      });

    if (!student) {
      throw new NotFoundError('Student profile not found');
    }

    const enrollments = await Enrollment.find({ 
      studentId,
      status: { $in: ['enrolled', 'completed'] }
    });

    const completedCourses = enrollments.filter(e => e.status === 'completed').length;
    const inProgressCourses = enrollments.filter(e => e.status === 'enrolled').length;

    const avgProgress = enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / enrollments.length || 0;

    const recentGrades = await Grade.find({ studentId })
      .populate('courseId', 'name code')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        profile: {
          id: student._id,
          firstName: student.userId.firstName,
          lastName: student.userId.lastName,
          email: student.userId.email,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          contactNumber: student.contactNumber,
          address: student.address,
          parentName: student.parentName,
          parentContact: student.parentContact,
          admissionDate: student.admissionDate,
          status: student.status
        },
        statistics: {
          totalCourses: enrollments.length,
          completedCourses,
          inProgressCourses,
          averageProgress: Math.round(avgProgress)
        },
        recentGrades
      }
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    throw error;
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const updateData = req.body;

    const allowedUpdates = {
      contactNumber: updateData.contactNumber,
      address: updateData.address,
      dateOfBirth: updateData.dateOfBirth,
      gender: updateData.gender
    };

    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      allowedUpdates,
      { new: true, runValidators: true }
    ).populate({
      path: 'userId',
      select: '-password'
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedStudent._id,
        firstName: updatedStudent.userId.firstName,
        lastName: updatedStudent.userId.lastName,
        email: updatedStudent.userId.email,
        ...updatedStudent.toObject()
      }
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    throw error;
  }
};

const getStudentCourses = async (req, res) => {
  try {
    const studentId = req.user.studentId;

    const enrollments = await Enrollment.find({ 
      studentId,
      status: { $in: ['enrolled', 'completed'] }
    })
    .populate({
      path: 'courseId',
      populate: {
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      }
    })
    .sort({ createdAt: -1 })
    .lean();

    const courses = enrollments.map(enrollment => ({
      _id: enrollment.courseId?._id,
      enrollmentId: enrollment._id,
      name: enrollment.courseId?.name,
      code: enrollment.courseId?.code,
      description: enrollment.courseId?.description,
      credits: enrollment.courseId?.credits,
      department: enrollment.courseId?.department,
      level: enrollment.courseId?.level,
      teacher: enrollment.courseId?.teacherId ? {
        name: `${enrollment.courseId.teacherId.userId?.firstName} ${enrollment.courseId.teacherId.userId?.lastName}`,
        specialization: enrollment.courseId.teacherId.specialization
      } : null,
      progress: enrollment.progress,
      status: enrollment.status,
      enrollmentDate: enrollment.enrollmentDate
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error('Get student courses error:', error);
    throw error;
  }
};

const getStudentCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.studentId;

    const enrollment = await Enrollment.findOne({
      studentId,
      courseId,
      status: { $in: ['enrolled', 'completed'] }
    });

    if (!enrollment) {
      throw new BadRequestError('You are not enrolled in this course');
    }

    const course = await Course.findById(courseId)
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      });

    const grades = await Grade.find({ studentId, courseId })
      .sort({ createdAt: -1 });

    const schedules = await Schedule.find({
      courseId,
      status: 'scheduled'
    }).sort({ dayOfWeek: 1, startTime: 1 });

    const totalMarks = grades.reduce((acc, g) => acc + g.obtainedMarks, 0);
    const totalMaxMarks = grades.reduce((acc, g) => acc + g.maxMarks, 0);
    const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        course: {
          id: course._id,
          name: course.name,
          code: course.code,
          description: course.description,
          credits: course.credits,
          department: course.department,
          level: course.level,
          syllabus: course.syllabus
        },
        teacher: course.teacherId ? {
          name: `${course.teacherId.userId.firstName} ${course.teacherId.userId.lastName}`,
          email: course.teacherId.userId.email,
          qualification: course.teacherId.qualification,
          specialization: course.teacherId.specialization
        } : null,
        enrollment: {
          status: enrollment.status,
          progress: enrollment.progress,
          enrolledDate: enrollment.enrollmentDate
        },
        academics: {
          grades,
          statistics: {
            totalAssessments: grades.length,
            overallPercentage: overallPercentage.toFixed(1),
            averageGrade: grades.length > 0 
              ? (grades.reduce((acc, g) => acc + (g.percentage || 0), 0) / grades.length).toFixed(1)
              : 0
          }
        },
        schedule: schedules
      }
    });
  } catch (error) {
    console.error('Get student course details error:', error);
    throw error;
  }
};

const getStudentSchedule = async (req, res) => {
  try {
    const studentId = req.user.studentId;

    const enrollments = await Enrollment.find({
      studentId,
      status: 'enrolled'
    }).select('courseId');

    const courseIds = enrollments.map(e => e.courseId);

    const schedules = await Schedule.find({
      courseId: { $in: courseIds },
      status: 'scheduled'
    })
    .populate({
      path: 'courseId',
      select: 'name code credits'
    })
    .populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'firstName lastName'
      }
    })
    .sort({ dayOfWeek: 1, startTime: 1 });

    const today = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = days[today.getDay()];
    const currentTime = today.toTimeString().slice(0, 5);

    const todayClasses = schedules
      .filter(s => s.dayOfWeek === todayDay)
      .map(s => ({
        ...s.toObject(),
        status: s.startTime <= currentTime && s.endTime >= currentTime ? 'ongoing' :
                s.endTime < currentTime ? 'completed' : 'upcoming'
      }));

    const weeklySchedule = days.reduce((acc, day) => {
      acc[day] = schedules.filter(s => s.dayOfWeek === day);
      return acc;
    }, {});

    res.status(StatusCodes.OK).json({
      success: true,
      today: {
        day: todayDay,
        date: today.toDateString(),
        classes: todayClasses
      },
      weekly: weeklySchedule
    });
  } catch (error) {
    console.error('Get student schedule error:', error);
    throw error;
  }
};

const getAllStudentGrades = async (req, res) => {
  try {
    const studentId = req.user.studentId;

    const grades = await Grade.find({ studentId })
      .populate('courseId', 'name code credits')
      .sort({ createdAt: -1 });

    const totalGrades = grades.length;
    const totalMarks = grades.reduce((acc, g) => acc + g.obtainedMarks, 0);
    const totalMaxMarks = grades.reduce((acc, g) => acc + g.maxMarks, 0);
    const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    const byCourse = grades.reduce((acc, grade) => {
      const courseId = grade.courseId._id.toString();
      if (!acc[courseId]) {
        acc[courseId] = {
          course: {
            id: courseId,
            name: grade.courseId.name,
            code: grade.courseId.code,
            credits: grade.courseId.credits
          },
          grades: [],
          courseAverage: 0
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

    Object.values(byCourse).forEach(course => {
      const total = course.grades.reduce((acc, g) => acc + g.percentage, 0);
      course.courseAverage = (total / course.grades.length).toFixed(1);
    });

    res.status(StatusCodes.OK).json({
      success: true,
      statistics: {
        totalGrades,
        overallPercentage: overallPercentage.toFixed(1),
        totalCourses: Object.keys(byCourse).length,
        gpa: (overallPercentage / 25).toFixed(2)
      },
      data: Object.values(byCourse)
    });
  } catch (error) {
    console.error('Get all student grades error:', error);
    throw error;
  }
};

const getCourseWiseGrades = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.studentId;

    const enrollment = await Enrollment.findOne({
      studentId,
      courseId,
      status: { $in: ['enrolled', 'completed'] }
    });

    if (!enrollment) {
      throw new BadRequestError('You are not enrolled in this course');
    }

    const course = await Course.findById(courseId).select('name code credits');
    
    const grades = await Grade.find({ studentId, courseId })
      .sort({ createdAt: -1 });

    const totalMarks = grades.reduce((acc, g) => acc + g.obtainedMarks, 0);
    const totalMaxMarks = grades.reduce((acc, g) => acc + g.maxMarks, 0);
    const averagePercentage = grades.reduce((acc, g) => acc + g.percentage, 0) / grades.length || 0;

    const byType = grades.reduce((acc, grade) => {
      if (!acc[grade.assessmentType]) {
        acc[grade.assessmentType] = [];
      }
      acc[grade.assessmentType].push(grade);
      return acc;
    }, {});

    res.status(StatusCodes.OK).json({
      success: true,
      course: {
        id: course._id,
        name: course.name,
        code: course.code,
        credits: course.credits
      },
      enrollment: {
        status: enrollment.status,
        progress: enrollment.progress
      },
      statistics: {
        totalAssessments: grades.length,
        totalMarks,
        totalMaxMarks,
        averagePercentage: averagePercentage.toFixed(1),
        grade: averagePercentage >= 90 ? 'A+' :
               averagePercentage >= 80 ? 'A' :
               averagePercentage >= 70 ? 'B' :
               averagePercentage >= 60 ? 'C' : 'D'
      },
      byAssessmentType: byType,
      allGrades: grades
    });
  } catch (error) {
    console.error('Get course wise grades error:', error);
    throw error;
  }
};

const getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user.studentId;

    const enrollments = await Enrollment.find({ studentId })
      .populate('courseId', 'name code credits')
      .sort({ createdAt: -1 });

    const totalProgress = enrollments.reduce((acc, e) => acc + (e.progress || 0), 0);
    const averageProgress = enrollments.length > 0 ? totalProgress / enrollments.length : 0;

    const grades = await Grade.find({ studentId })
      .populate('courseId', 'name code');

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentGrades = grades.filter(g => g.createdAt >= sixMonthsAgo);
    const monthlyPerformance = [];

    for (let i = 0; i < 6; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthGrades = recentGrades.filter(g => 
        g.createdAt >= monthStart && g.createdAt <= monthEnd
      );

      const avgPercentage = monthGrades.length > 0
        ? monthGrades.reduce((acc, g) => acc + g.percentage, 0) / monthGrades.length
        : 0;

      monthlyPerformance.unshift({
        month: month.toLocaleString('default', { month: 'short' }),
        average: avgPercentage.toFixed(1)
      });
    }

    const courseProgress = enrollments.map(e => ({
      course: {
        id: e.courseId._id,
        name: e.courseId.name,
        code: e.courseId.code,
        credits: e.courseId.credits
      },
      progress: e.progress,
      status: e.status,
      enrollmentDate: e.enrollmentDate
    }));

    const completedCourses = enrollments.filter(e => e.status === 'completed').length;
    const completionRate = enrollments.length > 0 
      ? (completedCourses / enrollments.length) * 100 
      : 0;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        overview: {
          totalCourses: enrollments.length,
          completedCourses,
          inProgress: enrollments.filter(e => e.status === 'enrolled').length,
          averageProgress: Math.round(averageProgress),
          completionRate: completionRate.toFixed(1)
        },
        performance: {
          monthlyTrend: monthlyPerformance,
          recentGrades: grades.slice(0, 5)
        },
        courses: courseProgress,
        upcomingDeadlines: []
      }
    });
  } catch (error) {
    console.error('Get student progress error:', error);
    throw error;
  }
};

const getAvailableCourses = async (req, res) => {
  try {
    const studentId = req.user.studentId;

    const availableCourses = await Course.find({ 
      status: 'active' 
    })
    .populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'firstName lastName'
      }
    })
    .select('name code description credits department level duration maxStudents status teacherId')
    .limit(100);

    const enrollments = await Enrollment.find({ 
      studentId,
      status: { $in: ['enrolled', 'completed'] }
    }).select('courseId');

    const enrolledCourseIds = enrollments.map(e => e.courseId.toString());

    const filteredCourses = availableCourses.filter(
      course => !enrolledCourseIds.includes(course._id.toString())
    );

    const coursesWithCounts = await Promise.all(
      filteredCourses.map(async (course) => {
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
      count: coursesWithCounts.length,
      data: coursesWithCounts
    });
  } catch (error) {
    console.error('Get available courses error:', error);
    throw error;
  }
};

const enrollInCourse = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const { courseId } = req.body;

    if (!courseId) {
      throw new BadRequestError('Course ID is required');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.status !== 'active') {
      throw new BadRequestError('This course is not available for enrollment');
    }

    const existingEnrollment = await Enrollment.findOne({
      studentId,
      courseId,
      status: { $in: ['enrolled', 'completed'] }
    });

    if (existingEnrollment) {
      throw new BadRequestError('You are already enrolled in this course');
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
    console.error('Enroll in course error:', error);
    throw error;
  }
};

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  getStudentCourses,
  getStudentCourseDetails,
  getStudentSchedule,
  getAllStudentGrades,
  getCourseWiseGrades,
  getStudentProgress,
  getAvailableCourses,
  enrollInCourse
};