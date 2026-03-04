const { Course, Teacher, User } = require('../models');
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
    });
    return teacher?._id;
  }
};

const addCourse = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      teacherId,
      credits,
      duration,
      department,
      level,
      syllabus,
      prerequisites,
      maxStudents,
      status
    } = req.body;

    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      throw new BadRequestError('Course code already exists');
    }

    if (teacherId) {
      const resolvedTeacherId = await resolveTeacherId(teacherId);
      if (!resolvedTeacherId) {
        throw new NotFoundError('Teacher not found');
      }
    }

    const course = await Course.create({
      name,
      code,
      description,
      teacherId: teacherId ? await resolveTeacherId(teacherId) : undefined,
      credits,
      duration,
      department,
      level: level || 'beginner',
      syllabus,
      prerequisites: prerequisites || [],
      maxStudents: maxStudents || 50,
      status: status || 'active'
    });

    await course.populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email'
      }
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Course added successfully',
      data: course
    });
  } catch (error) {
    console.error('Add course error:', error);
    if (error.code === 11000) {
      throw new BadRequestError('Course code already exists');
    }
    throw error;
  }
};

const getAllCourses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      department, 
      level, 
      status,
      teacherId 
    } = req.query;

    const query = {};
    if (department) query.department = { $regex: department, $options: 'i' };
    if (level) query.level = level;
    if (status) query.status = status;

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

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const courses = await Course.find(query)
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const Enrollment = require('../models/Enrollment');
    const coursesWithCounts = await Promise.all(
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

    const total = await Course.countDocuments(query);

    res.status(StatusCodes.OK).json({
      success: true,
      count: courses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: coursesWithCounts
    });
  } catch (error) {
    console.error('Get all courses error:', error);
    throw error;
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id)
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const Enrollment = require('../models/Enrollment');
    const enrolledCount = await Enrollment.countDocuments({ 
      courseId: id,
      status: 'enrolled'
    });

    const enrolledStudents = await Enrollment.find({ 
      courseId: id,
      status: 'enrolled'
    }).populate({
      path: 'studentId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email'
      }
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        ...course.toObject(),
        enrolledCount,
        enrolledStudents
      }
    });
  } catch (error) {
    console.error('Get course by id error:', error);
    throw error;
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const course = await Course.findById(id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (updateData.code && updateData.code !== course.code) {
      const existingCourse = await Course.findOne({ 
        code: updateData.code,
        _id: { $ne: id }
      });
      if (existingCourse) {
        throw new BadRequestError('Course code already exists');
      }
    }

    if (updateData.teacherId) {
      const resolvedTeacherId = await resolveTeacherId(updateData.teacherId);
      if (!resolvedTeacherId) {
        throw new NotFoundError('Teacher not found');
      }
      updateData.teacherId = resolvedTeacherId;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email'
      }
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    if (error.code === 11000) {
      throw new BadRequestError('Course code already exists');
    }
    throw error;
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const Enrollment = require('../models/Enrollment');
    const enrolledStudents = await Enrollment.countDocuments({ 
      courseId: id,
      status: { $in: ['enrolled', 'completed'] }
    });

    if (enrolledStudents > 0) {
      throw new BadRequestError('Cannot delete course with enrolled students. Please remove students first.');
    }

    await Enrollment.deleteMany({ courseId: id });

    const Grade = require('../models/Grade');
    await Grade.deleteMany({ courseId: id });

    await course.deleteOne();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    throw error;
  }
};

const assignTeacher = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      throw new BadRequestError('Teacher ID is required');
    }

    const resolvedTeacherId = await resolveTeacherId(teacherId);
    if (!resolvedTeacherId) {
      throw new NotFoundError('Teacher not found');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const teacher = await Teacher.findById(resolvedTeacherId).populate({
      path: 'userId',
      select: 'firstName lastName email'
    });
    
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    course.teacherId = resolvedTeacherId;
    await course.save();

    const updatedCourse = await Course.findById(courseId)
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Teacher assigned to course successfully',
      data: {
        course: updatedCourse,
        teacher: {
          id: teacher._id,
          name: `${teacher.userId.firstName} ${teacher.userId.lastName}`,
          employeeId: teacher.employeeId,
          specialization: teacher.specialization
        }
      }
    });
  } catch (error) {
    console.error('Assign teacher error:', error);
    throw error;
  }
};

const getCourseStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ status: 'active' });
    const upcomingCourses = await Course.countDocuments({ status: 'upcoming' });
    const completedCourses = await Course.countDocuments({ status: 'completed' });

    const byDepartment = await Course.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const byLevel = await Course.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const Enrollment = require('../models/Enrollment');
    const topCourses = await Enrollment.aggregate([
      { $match: { status: 'enrolled' } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
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
          count: 1
        }
      }
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        total: totalCourses,
        active: activeCourses,
        upcoming: upcomingCourses,
        completed: completedCourses,
        byDepartment,
        byLevel,
        topCourses
      }
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    throw error;
  }
};

module.exports = {
  addCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  assignTeacher,
  getCourseStats
};