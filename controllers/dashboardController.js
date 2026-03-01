const { Course, Enrollment, Schedule } = require('../models');
const { StatusCodes } = require('http-status-codes');

const getDashboardStats = async (req, res) => {
  try {
    const role = req.user.role;
    let stats = {};

    if (role === 'admin') {
      // Admin dashboard stats with comprehensive data
      const StudentModel = require('../models').Student;
      const TeacherModel = require('../models').Teacher;
      
      const today = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayDay = days[today.getDay()];
      
      const [
        totalStudents,
        totalTeachers,
        totalCourses,
        totalEnrollments,
        activeCourses,
        activeEnrollments,
        todayClasses,
        recentEnrollments,
        popularCourses,
        studentStatus,
        courseStatus
      ] = await Promise.all([
        StudentModel.countDocuments(),
        TeacherModel.countDocuments(),
        Course.countDocuments(),
        Enrollment.countDocuments(),
        Course.countDocuments({ status: 'active' }),
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
        
        StudentModel.aggregate([
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

      const completedEnrollments = await Enrollment.countDocuments({ 
        status: 'completed' 
      });
      const completionRate = totalEnrollments > 0 
        ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
        : 0;

      const avgStudentsPerCourse = totalCourses > 0
        ? (totalEnrollments / totalCourses).toFixed(1)
        : 0;

      stats = {
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
        }
      };
    } else if (role === 'teacher') {
      const teacherId = req.user.teacherId;
      const courses = await Course.find({ teacherId });
      const courseIds = courses.map(c => c._id);
      
      const totalStudents = await Enrollment.countDocuments({
        courseId: { $in: courseIds },
        status: 'enrolled'
      });

      stats = {
        totalCourses: courses.length,
        totalStudents,
        todayClasses: await Schedule.countDocuments({
          teacherId,
          status: 'scheduled'
        })
      };
    } else if (role === 'student') {
      const studentId = req.user.studentId;
      const enrollments = await Enrollment.find({ studentId });
      
      stats = {
        totalCourses: enrollments.length,
        completedCourses: enrollments.filter(e => e.status === 'completed').length,
        inProgress: enrollments.filter(e => e.status === 'enrolled').length,
        averageProgress: enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / enrollments.length || 0
      };
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching dashboard stats'
    });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    throw error;
  }
};

const getAnnouncements = async (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    throw error;
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity,
  getAnnouncements
};