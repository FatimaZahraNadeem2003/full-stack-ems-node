const { User, Student, Teacher, Course, Enrollment, Schedule } = require('../models');
const { StatusCodes } = require('http-status-codes');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/reports/dashboard
 * @access  Private/Admin
 */
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = days[today.getDay()];

    const [
      totalStudents,
      totalTeachers,
      totalCourses,
      activeCourses,
      totalEnrollments,
      activeEnrollments,
      todayClasses,
      recentEnrollments,
      popularCourses,
      studentStatus,
      courseStatus
    ] = await Promise.all([
      Student.countDocuments(),
      
      Teacher.countDocuments(),
      
      Course.countDocuments(),
      
      Course.countDocuments({ status: 'active' }),
      
      Enrollment.countDocuments(),
      
      Enrollment.countDocuments({ status: 'enrolled' }),
      
      Schedule.find({ 
        dayOfWeek: todayDay,
        status: 'scheduled'
      })
      .populate([
        { 
          path: 'courseId', 
          select: 'name code credits' 
        },
        { 
          path: 'teacherId',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        }
      ])
      .sort({ startTime: 1 }),
      
      Enrollment.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
      .populate([
        { 
          path: 'studentId',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        },
        { path: 'courseId', select: 'name code' }
      ])
      .sort({ createdAt: -1 })
      .limit(10),
      
      Enrollment.aggregate([
        { $match: { status: 'enrolled' } },
        { $group: { 
            _id: '$courseId', 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'course'
          }
        },
        { $unwind: '$course' },
        { $project: {
            'course.name': 1,
            'course.code': 1,
            'course.department': 1,
            count: 1
          }
        }
      ]),
      
      Student.aggregate([
        { $group: { 
            _id: '$status', 
            count: { $sum: 1 } 
          } 
        }
      ]),
      
      Course.aggregate([
        { $group: { 
            _id: '$status', 
            count: { $sum: 1 } 
          } 
        }
      ])
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const enrollmentTrends = await Enrollment.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const completedEnrollments = await Enrollment.countDocuments({ 
      status: 'completed' 
    });
    const completionRate = totalEnrollments > 0 
      ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
      : 0;

    const avgStudentsPerCourse = totalCourses > 0
      ? (totalEnrollments / totalCourses).toFixed(1)
      : 0;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          totalCourses,
          totalEnrollments,
          activeCourses,
          activeEnrollments,
          completionRate: parseFloat(completionRate),
          avgStudentsPerCourse: parseFloat(avgStudentsPerCourse)
        },
        todayClasses: {
          count: todayClasses.length,
          classes: todayClasses
        },
        popularCourses,
        recentActivity: {
          enrollments: recentEnrollments
        },
        distributions: {
          studentsByStatus: studentStatus,
          coursesByStatus: courseStatus
        },
        trends: {
          enrollmentTrends
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    throw error;
  }
};

/**
 * @desc    Get total students count with details
 * @route   GET /api/admin/reports/students-count
 * @access  Private/Admin
 */
const getStudentsCount = async (req, res) => {
  try {
    const { status, class: className, section } = req.query;

    const query = {};
    if (status) query.status = status;
    if (className) query.class = className;
    if (section) query.section = section;

    const [
      total,
      active,
      inactive,
      graduated,
      suspended,
      byClass,
      byGender,
      recentJoining
    ] = await Promise.all([
      Student.countDocuments(query),
      
      Student.countDocuments({ ...query, status: 'active' }),
      
      Student.countDocuments({ ...query, status: 'inactive' }),
      
      Student.countDocuments({ ...query, status: 'graduated' }),
      
      Student.countDocuments({ ...query, status: 'suspended' }),
      
      Student.aggregate([
        { $match: query },
        { $group: { 
            _id: '$class', 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { count: -1 } }
      ]),
      
      Student.aggregate([
        { $match: query },
        { $group: { 
            _id: '$gender', 
            count: { $sum: 1 } 
          } 
        }
      ]),
      
      Student.countDocuments({
        ...query,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    const classDistribution = byClass.map(item => ({
      class: item._id,
      count: item.count,
      percentage: ((item.count / total) * 100).toFixed(1)
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        graduated,
        suspended,
        recentJoining,
        distributions: {
          byClass: classDistribution,
          byGender: byGender.reduce((acc, item) => {
            acc[item._id || 'not-specified'] = {
              count: item.count,
              percentage: ((item.count / total) * 100).toFixed(1)
            };
            return acc;
          }, {})
        }
      }
    });
  } catch (error) {
    console.error('Get students count error:', error);
    throw error;
  }
};

/**
 * @desc    Get total courses count with details
 * @route   GET /api/admin/reports/courses-count
 * @access  Private/Admin
 */
const getCoursesCount = async (req, res) => {
  try {
    const { status, department, level } = req.query;

    const query = {};
    if (status) query.status = status;
    if (department) query.department = department;
    if (level) query.level = level;

    const [
      total,
      active,
      inactive,
      upcoming,
      completed,
      byDepartment,
      byLevel,
      byCredits,
      averageCredits,
      totalEnrollments
    ] = await Promise.all([
      Course.countDocuments(query),
      
      Course.countDocuments({ ...query, status: 'active' }),
      
      Course.countDocuments({ ...query, status: 'inactive' }),
      
      Course.countDocuments({ ...query, status: 'upcoming' }),
      
      Course.countDocuments({ ...query, status: 'completed' }),
      
      Course.aggregate([
        { $match: query },
        { $group: { 
            _id: '$department', 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { count: -1 } }
      ]),
      
      Course.aggregate([
        { $match: query },
        { $group: { 
            _id: '$level', 
            count: { $sum: 1 } 
          } 
        }
      ]),
      
      Course.aggregate([
        { $match: query },
        { $group: { 
            _id: '$credits', 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { _id: 1 } }
      ]),
      
      Course.aggregate([
        { $match: query },
        { $group: { 
            _id: null, 
            average: { $avg: '$credits' } 
          } 
        }
      ]),
      
      Enrollment.countDocuments()
    ]);

    const enrollmentPerCourse = await Enrollment.aggregate([
      { $match: { status: 'enrolled' } },
      { $group: { 
          _id: '$courseId', 
          count: { $sum: 1 } 
        } 
      },
      { $group: {
          _id: null,
          avgEnrollment: { $avg: '$count' },
          maxEnrollment: { $max: '$count' },
          minEnrollment: { $min: '$count' }
        }
      }
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        upcoming,
        completed,
        statistics: {
          averageCredits: averageCredits[0]?.average.toFixed(1) || 0,
          averageEnrollmentPerCourse: enrollmentPerCourse[0]?.avgEnrollment.toFixed(1) || 0,
          maxEnrollmentPerCourse: enrollmentPerCourse[0]?.maxEnrollment || 0,
          minEnrollmentPerCourse: enrollmentPerCourse[0]?.minEnrollment || 0,
          totalEnrollmentsAcrossCourses: totalEnrollments
        },
        distributions: {
          byDepartment: byDepartment.map(item => ({
            department: item._id,
            count: item.count,
            percentage: ((item.count / total) * 100).toFixed(1)
          })),
          byLevel: byLevel.reduce((acc, item) => {
            acc[item._id] = {
              count: item.count,
              percentage: ((item.count / total) * 100).toFixed(1)
            };
            return acc;
          }, {}),
          byCredits: byCredits.reduce((acc, item) => {
            acc[`${item._id} credits`] = {
              count: item.count,
              percentage: ((item.count / total) * 100).toFixed(1)
            };
            return acc;
          }, {})
        }
      }
    });
  } catch (error) {
    console.error('Get courses count error:', error);
    throw error;
  }
};

/**
 * @desc    Get today's classes
 * @route   GET /api/admin/reports/today-classes
 * @access  Private/Admin
 */
const getTodayClasses = async (req, res) => {
  try {
    const today = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = days[today.getDay()];
    const currentTime = today.toTimeString().slice(0, 5);

    const schedules = await Schedule.find({ 
      dayOfWeek: todayDay,
      status: 'scheduled'
    })
    .populate([
      { 
        path: 'courseId', 
        select: 'name code credits department' 
      },
      { 
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      }
    ])
    .sort({ startTime: 1 });

    const classesWithDetails = await Promise.all(
      schedules.map(async (schedule) => {
        const enrolledCount = await Enrollment.countDocuments({
          courseId: schedule.courseId._id,
          status: 'enrolled'
        });

        let classStatus = 'upcoming';
        if (schedule.startTime <= currentTime && schedule.endTime >= currentTime) {
          classStatus = 'ongoing';
        } else if (schedule.endTime < currentTime) {
          classStatus = 'completed';
        }

        return {
          ...schedule.toObject(),
          enrolledStudents: enrolledCount,
          status: classStatus,
          timeStatus: {
            start: schedule.startTime,
            end: schedule.endTime,
            current: currentTime,
            isOngoing: classStatus === 'ongoing',
            isCompleted: classStatus === 'completed'
          }
        };
      })
    );

    const groupedClasses = {
      ongoing: classesWithDetails.filter(c => c.status === 'ongoing'),
      upcoming: classesWithDetails.filter(c => c.status === 'upcoming'),
      completed: classesWithDetails.filter(c => c.status === 'completed')
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        date: today.toDateString(),
        day: todayDay,
        totalClasses: schedules.length,
        summary: {
          ongoing: groupedClasses.ongoing.length,
          upcoming: groupedClasses.upcoming.length,
          completed: groupedClasses.completed.length
        },
        classes: groupedClasses
      }
    });
  } catch (error) {
    console.error('Get today classes error:', error);
    throw error;
  }
};

/**
 * @desc    Get teacher workload report
 * @route   GET /api/admin/reports/teacher-workload
 * @access  Private/Admin
 */
const getTeacherWorkload = async (req, res) => {
  try {
    const teachers = await Teacher.find({ status: 'active' })
      .populate({
        path: 'userId',
        select: 'firstName lastName email'
      });

    const workloadData = await Promise.all(
      teachers.map(async (teacher) => {
        const [
          assignedCourses,
          todayClasses,
          weeklyClasses,
          totalStudents
        ] = await Promise.all([
          Course.countDocuments({ teacherId: teacher._id, status: 'active' }),
          
          Schedule.countDocuments({
            teacherId: teacher._id,
            dayOfWeek: days[today.getDay()],
            status: 'scheduled'
          }),
          
          Schedule.countDocuments({
            teacherId: teacher._id,
            status: 'scheduled'
          }),
          
          Enrollment.distinct('studentId', {
            courseId: { $in: await Course.find({ teacherId: teacher._id }).distinct('_id') },
            status: 'enrolled'
          }).then(students => students.length)
        ]);

        return {
          teacher: {
            id: teacher._id,
            name: `${teacher.userId.firstName} ${teacher.userId.lastName}`,
            employeeId: teacher.employeeId,
            specialization: teacher.specialization
          },
          workload: {
            assignedCourses,
            todayClasses,
            weeklyClasses,
            totalStudents
          }
        };
      })
    );

    workloadData.sort((a, b) => b.workload.weeklyClasses - a.workload.weeklyClasses);

    res.status(StatusCodes.OK).json({
      success: true,
      data: workloadData
    });
  } catch (error) {
    console.error('Get teacher workload error:', error);
    throw error;
  }
};

module.exports = {
  getDashboardStats,
  getStudentsCount,
  getCoursesCount,
  getTodayClasses,
  getTeacherWorkload
};