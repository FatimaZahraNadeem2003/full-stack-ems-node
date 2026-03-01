const { Schedule, Course, Teacher } = require('../models');
const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

/**
 * @desc    Create new schedule
 * @route   POST /api/admin/schedules
 * @access  Private/Admin
 */
const createSchedule = async (req, res) => {
  try {
    const {
      courseId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      building,
      semester,
      academicYear,
      isRecurring,
      status
    } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    const conflictingSchedule = await Schedule.findOne({
      dayOfWeek,
      room,
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ],
      status: { $ne: 'cancelled' }
    });

    if (conflictingSchedule) {
      throw new BadRequestError('Room already booked for this time slot');
    }

    const teacherConflict = await Schedule.findOne({
      teacherId,
      dayOfWeek,
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ],
      status: { $ne: 'cancelled' }
    });

    if (teacherConflict) {
      throw new BadRequestError('Teacher already has a class at this time');
    }

    const schedule = await Schedule.create({
      courseId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      building,
      semester,
      academicYear,
      isRecurring: isRecurring !== undefined ? isRecurring : true,
      status: status || 'scheduled'
    });

    // Populate related data
    await schedule.populate([
      { path: 'courseId', select: 'name code credits' },
      { 
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      }
    ]);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Schedule created successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    throw error;
  }
};

/**
 * @desc    Get all schedules
 * @route   GET /api/admin/schedules
 * @access  Private/Admin
 */
const getAllSchedules = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      dayOfWeek,
      courseId,
      teacherId,
      semester,
      academicYear,
      status,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};
    if (dayOfWeek) query.dayOfWeek = dayOfWeek;
    if (courseId) query.courseId = courseId;
    if (teacherId) query.teacherId = teacherId;
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get schedules with populated data
    const schedules = await Schedule.find(query)
      .populate([
        { path: 'courseId', select: 'name code credits department' },
        { 
          path: 'teacherId',
          populate: {
            path: 'userId',
            select: 'firstName lastName email'
          }
        }
      ])
      .sort({ dayOfWeek: 1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Schedule.countDocuments(query);

    // Group by day for easier frontend consumption
    const groupedByDay = schedules.reduce((acc, schedule) => {
      const day = schedule.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(schedule);
      return acc;
    }, {});

    res.status(StatusCodes.OK).json({
      success: true,
      count: schedules.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: schedules,
      groupedByDay
    });
  } catch (error) {
    console.error('Get all schedules error:', error);
    throw error;
  }
};

/**
 * @desc    Get schedule by ID
 * @route   GET /api/admin/schedules/:id
 * @access  Private/Admin
 */
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id)
      .populate([
        { path: 'courseId', select: 'name code credits description' },
        { 
          path: 'teacherId',
          populate: {
            path: 'userId',
            select: 'firstName lastName email'
          }
        }
      ]);

    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Get schedule by id error:', error);
    throw error;
  }
};

/**
 * @desc    Update schedule
 * @route   PUT /api/admin/schedules/:id
 * @access  Private/Admin
 */
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find schedule
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    // Check for conflicts if time/room/teacher changed
    if (updateData.dayOfWeek || updateData.startTime || updateData.endTime || 
        updateData.room || updateData.teacherId) {
      
      const conflictQuery = {
        _id: { $ne: id },
        dayOfWeek: updateData.dayOfWeek || schedule.dayOfWeek,
        status: { $ne: 'cancelled' },
        $or: [
          {
            startTime: { $lt: updateData.endTime || schedule.endTime },
            endTime: { $gt: updateData.startTime || schedule.startTime }
          }
        ]
      };

      // Room conflict
      if (updateData.room || schedule.room) {
        const roomConflict = await Schedule.findOne({
          ...conflictQuery,
          room: updateData.room || schedule.room
        });
        if (roomConflict) {
          throw new BadRequestError('Room already booked for this time slot');
        }
      }

      // Teacher conflict
      if (updateData.teacherId || schedule.teacherId) {
        const teacherConflict = await Schedule.findOne({
          ...conflictQuery,
          teacherId: updateData.teacherId || schedule.teacherId
        });
        if (teacherConflict) {
          throw new BadRequestError('Teacher already has a class at this time');
        }
      }
    }

    // Update schedule
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'courseId', select: 'name code credits' },
      { 
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      }
    ]);

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
 * @desc    Delete schedule
 * @route   DELETE /api/admin/schedules/:id
 * @access  Private/Admin
 */
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    await schedule.deleteOne();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    throw error;
  }
};

/**
 * @desc    Get weekly schedule
 * @route   GET /api/admin/schedules/weekly
 * @access  Private/Admin
 */
const getWeeklySchedule = async (req, res) => {
  try {
    const { weekStart, semester, academicYear } = req.query;

    const query = {};
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    const schedules = await Schedule.find(query)
      .populate([
        { path: 'courseId', select: 'name code credits' },
        { 
          path: 'teacherId',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        }
      ])
      .sort({ dayOfWeek: 1, startTime: 1 });

    // Group by day of week
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weeklySchedule = days.reduce((acc, day) => {
      acc[day] = schedules.filter(s => s.dayOfWeek === day);
      return acc;
    }, {});

    res.status(StatusCodes.OK).json({
      success: true,
      data: weeklySchedule
    });
  } catch (error) {
    console.error('Get weekly schedule error:', error);
    throw error;
  }
};

module.exports = {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getWeeklySchedule
};