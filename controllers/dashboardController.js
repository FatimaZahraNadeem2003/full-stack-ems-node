const { Course, Enrollment, Schedule } = require('../models');
const { StatusCodes } = require('http-status-codes');

const getDashboardStats = async (req, res) => {
  try {
    const role = req.user.role;
    let stats = {};

    if (role === 'admin') {
      // Admin dashboard stats
      const [
        totalStudents,
        totalTeachers,
        totalCourses,
        totalEnrollments
      ] = await Promise.all([
        require('../models').Student.countDocuments(),
        require('../models').Teacher.countDocuments(),
        require('../models').Course.countDocuments(),
        require('../models').Enrollment.countDocuments()
      ]);

      stats = {
        totalStudents,
        totalTeachers,
        totalCourses,
        totalEnrollments,
        activeEnrollments: await Enrollment.countDocuments({ status: 'enrolled' }),
        todayClasses: await Schedule.countDocuments({
          status: 'scheduled',
          dayOfWeek: new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase()
        })
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