const { Schedule, Course, Teacher } = require('../models');
const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

const resolveTeacherId = async (teacherIdentifier) => {
  if (!teacherIdentifier) return null;
  const isValidObjectId = teacherIdentifier.match(/^[0-9a-fA-F]{24}$/);
  if (isValidObjectId) {
    return teacherIdentifier;
  } else {
    const teacher = await Teacher.findOne({ 
      $or: [
        { employeeId: teacherIdentifier },
        { 'userId.email': teacherIdentifier }
      ]
    }).lean();
    return teacher?._id;
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
    }).lean();
    return course?._id;
  }
};

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

    if (!courseId || !teacherId || !dayOfWeek || !startTime || !endTime || !room || !semester || !academicYear) {
      throw new BadRequestError('Please provide all required fields');
    }

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

const getAllSchedules = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search,
      dayOfWeek,
      courseId,
      teacherId,
      semester,
      academicYear,
      status
    } = req.query;

    const query = {};
    
    // Apply filters
    if (dayOfWeek) query.dayOfWeek = dayOfWeek;
    if (semester) query.semester = { $regex: semester, $options: 'i' };
    if (academicYear) query.academicYear = { $regex: academicYear, $options: 'i' };
    if (status) query.status = status;

    // Handle courseId filter
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

    // Handle teacherId filter
    if (teacherId) {
      const resolvedTeacherId = await resolveTeacherId(teacherId);
      if (resolvedTeacherId) {
        query.teacherId = resolvedTeacherId;
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

    // Handle search - search in course name, teacher name, room, building
    if (search && search.trim() !== '') {
      // First, find courses that match the search
      const courses = await Course.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      
      const courseIds = courses.map(c => c._id);

      // Find teachers that match the search
      const teachers = await Teacher.find({
        $or: [
          { 'userId.firstName': { $regex: search, $options: 'i' } },
          { 'userId.lastName': { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
          { specialization: { $regex: search, $options: 'i' } }
        ]
      }).populate({
        path: 'userId',
        select: 'firstName lastName'
      }).select('_id').lean();
      
      const teacherIds = teachers.map(t => t._id);

      // Build search query
      query.$or = [
        { room: { $regex: search, $options: 'i' } },
        { building: { $regex: search, $options: 'i' } },
        { semester: { $regex: search, $options: 'i' } },
        { academicYear: { $regex: search, $options: 'i' } }
      ];

      if (courseIds.length > 0) {
        query.$or.push({ courseId: { $in: courseIds } });
      }

      if (teacherIds.length > 0) {
        query.$or.push({ teacherId: { $in: teacherIds } });
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100);

    const schedules = await Schedule.find(query)
      .populate([
        { 
          path: 'courseId', 
          select: 'name code credits department',
          populate: {
            path: 'teacherId',
            select: 'name'
          }
        },
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
      .limit(limitNum)
      .lean();

    const total = await Schedule.countDocuments(query);

    const groupedByDay = schedules.reduce((acc, schedule) => {
      const day = schedule.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(schedule);
      return acc;
    }, {});

    console.log(`Found ${schedules.length} schedules matching query`);

    res.status(StatusCodes.OK).json({
      success: true,
      count: schedules.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limitNum),
      data: schedules,
      groupedByDay
    });
  } catch (error) {
    console.error('Get all schedules error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      msg: 'Failed to fetch schedules'
    });
  }
};

const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid schedule ID format');
    }

    const schedule = await Schedule.findById(id)
      .populate([
        { 
          path: 'courseId', 
          select: 'name code credits description',
          populate: {
            path: 'teacherId',
            select: 'name'
          }
        },
        { 
          path: 'teacherId',
          populate: {
            path: 'userId',
            select: 'firstName lastName email'
          }
        }
      ])
      .lean();

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

const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid schedule ID format');
    }

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    // Check for conflicts if time or room or teacher is being updated
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

      // Check room conflict
      if (updateData.room || schedule.room) {
        const roomConflict = await Schedule.findOne({
          ...conflictQuery,
          room: updateData.room || schedule.room
        });
        if (roomConflict) {
          throw new BadRequestError('Room already booked for this time slot');
        }
      }

      // Check teacher conflict
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

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate([
      { path: 'courseId', select: 'name code credits' },
      { 
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      }
    ]).lean();

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

const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid schedule ID format');
    }

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    await Schedule.findByIdAndDelete(id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    throw error;
  }
};

const getWeeklySchedule = async (req, res) => {
  try {
    const { weekStart, semester, academicYear, teacherId, courseId } = req.query;

    const query = {};
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    if (teacherId) {
      const resolvedTeacherId = await resolveTeacherId(teacherId);
      if (resolvedTeacherId) {
        query.teacherId = resolvedTeacherId;
      }
    }

    if (courseId) {
      const resolvedCourseId = await resolveCourseId(courseId);
      if (resolvedCourseId) {
        query.courseId = resolvedCourseId;
      }
    }

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
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

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