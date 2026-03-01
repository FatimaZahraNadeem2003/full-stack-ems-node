const { Schedule, Enrollment } = require('../models');
const { StatusCodes } = require('http-status-codes');

const getMySchedule = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let schedules = [];
    
    if (role === 'teacher') {
      const teacherId = req.user.teacherId;
      schedules = await Schedule.find({ teacherId, status: 'scheduled' })
        .populate('courseId', 'name code')
        .sort({ dayOfWeek: 1, startTime: 1 });
    } else if (role === 'student') {
      const studentId = req.user.studentId;
      const enrollments = await Enrollment.find({ studentId, status: 'enrolled' }).select('courseId');
      const courseIds = enrollments.map(e => e.courseId);
      
      schedules = await Schedule.find({ 
        courseId: { $in: courseIds },
        status: 'scheduled'
      })
      .populate('courseId', 'name code')
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      })
      .sort({ dayOfWeek: 1, startTime: 1 });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Get my schedule error:', error);
    throw error;
  }
};

const getUpcomingEvents = async (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    throw error;
  }
};

const markAttendance = async (req, res) => {
  try {
    const { scheduleId, studentId, status } = req.body;

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    throw error;
  }
};

module.exports = {
  getMySchedule,
  getUpcomingEvents,
  markAttendance
};