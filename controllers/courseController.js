const { Course, Teacher, User } = require('../models');
const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

const resolveTeacherId = async (teacherIdentifier) => {
  if (!teacherIdentifier) return null;
  const isValidObjectId = teacherIdentifier.match(/^[0-9a-fA-F]{24}$/);
  if (isValidObjectId) {
    return teacherIdentifier;
  } else {
    try {
      const teacher = await Teacher.findOne({ 
        $or: [
          { employeeId: teacherIdentifier },
          { 'userId.email': teacherIdentifier }
        ]
      }).lean().maxTimeMS(5000);
      return teacher?._id;
    } catch (error) {
      console.error('Error resolving teacher ID:', error.message);
      return null;
    }
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

    if (!name || !code || !description || !credits || !duration || !department) {
      throw new BadRequestError('Please provide all required fields');
    }

    const existingCourse = await Course.findOne({ code }).lean().maxTimeMS(5000);
    if (existingCourse) {
      throw new BadRequestError('Course code already exists');
    }

    let resolvedTeacherId = null;
    if (teacherId) {
      resolvedTeacherId = await resolveTeacherId(teacherId);
      if (!resolvedTeacherId) {
        throw new NotFoundError('Teacher not found');
      }
    }

    const courseData = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      credits: parseInt(credits) || 3,
      duration: duration.trim(),
      department: department.trim(),
      level: level || 'beginner',
      syllabus: syllabus || '',
      prerequisites: prerequisites || [],
      maxStudents: parseInt(maxStudents) || 50,
      status: status || 'active'
    };

    if (resolvedTeacherId) {
      courseData.teacherId = resolvedTeacherId;
    }

    const course = await Course.create(courseData);

    const populatedCourse = await Course.findById(course._id)
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      })
      .lean()
      .maxTimeMS(5000);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Course added successfully',
      data: populatedCourse
    });
  } catch (error) {
    console.error('Add course error:', error.message);
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
    
    if (status) {
      query.status = status;
    }
    
    if (department) query.department = { $regex: department, $options: 'i' };
    if (level) query.level = level;

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

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } },
        { department: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100); 

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
      .limit(limitNum)
      .lean()
      .maxTimeMS(5000);

    const Enrollment = require('../models/Enrollment');
    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        try {
          const enrolledCount = await Enrollment.countDocuments({ 
            courseId: course._id,
            status: 'enrolled'
          }).maxTimeMS(5000);
          return {
            ...course,
            enrolledCount
          };
        } catch (error) {
          console.error('Error counting enrollment:', error.message);
          return {
            ...course,
            enrolledCount: 0
          };
        }
      })
    );

    const total = await Course.countDocuments(query).maxTimeMS(5000);

    res.status(StatusCodes.OK).json({
      success: true,
      count: courses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limitNum),
      data: coursesWithCounts
    });
  } catch (error) {
    console.error('Get all courses error:', error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      msg: 'Failed to fetch courses'
    });
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid course ID format');
    }

    const course = await Course.findById(id)
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      })
      .lean()
      .maxTimeMS(5000);

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const Enrollment = require('../models/Enrollment');
    const enrolledCount = await Enrollment.countDocuments({ 
      courseId: id,
      status: 'enrolled'
    }).maxTimeMS(5000);

    const enrolledStudents = await Enrollment.find({ 
      courseId: id,
      status: 'enrolled'
    })
      .populate({
        path: 'studentId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      })
      .lean()
      .maxTimeMS(5000);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        ...course,
        enrolledCount,
        enrolledStudents
      }
    });
  } catch (error) {
    console.error('Get course by id error:', error.message);
    
    if (error.name === 'CastError') {
      throw new BadRequestError('Invalid course ID format');
    }
    
    throw error;
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid course ID format');
    }

    const course = await Course.findById(id).maxTimeMS(5000);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (updateData.code && updateData.code !== course.code) {
      const existingCourse = await Course.findOne({ 
        code: updateData.code.trim().toUpperCase(),
        _id: { $ne: id }
      }).lean().maxTimeMS(5000);
      if (existingCourse) {
        throw new BadRequestError('Course code already exists');
      }
    }

    const updateFields = { ...updateData };
    
    if (updateFields.code) {
      updateFields.code = updateFields.code.trim().toUpperCase();
    }
    
    if (updateFields.credits) {
      updateFields.credits = parseInt(updateFields.credits);
    }
    
    if (updateFields.maxStudents) {
      updateFields.maxStudents = parseInt(updateFields.maxStudents);
    }

    if (updateFields.teacherId) {
      const resolvedTeacherId = await resolveTeacherId(updateFields.teacherId);
      if (!resolvedTeacherId) {
        throw new NotFoundError('Teacher not found');
      }
      updateFields.teacherId = resolvedTeacherId;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    )
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      })
      .lean()
      .maxTimeMS(5000);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error.message);
    if (error.code === 11000) {
      throw new BadRequestError('Course code already exists');
    }
    throw error;
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid course ID format');
    }

    const course = await Course.findById(id).maxTimeMS(5000);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const Enrollment = require('../models/Enrollment');
    const enrolledStudents = await Enrollment.countDocuments({ 
      courseId: id,
      status: { $in: ['enrolled', 'completed'] }
    }).maxTimeMS(5000);

    if (enrolledStudents > 0) {
      throw new BadRequestError('Cannot delete course with enrolled students. Please remove students first.');
    }

    await Enrollment.deleteMany({ courseId: id }).maxTimeMS(5000);

    const Grade = require('../models/Grade');
    await Grade.deleteMany({ courseId: id }).maxTimeMS(5000);

    await Course.findByIdAndDelete(id).maxTimeMS(5000);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error.message);
    throw error;
  }
};

const assignTeacher = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { teacherId } = req.body;

    if (!courseId || !courseId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid course ID format');
    }

    if (!teacherId) {
      throw new BadRequestError('Teacher ID is required');
    }

    const resolvedTeacherId = await resolveTeacherId(teacherId);
    if (!resolvedTeacherId) {
      throw new NotFoundError('Teacher not found');
    }

    const course = await Course.findById(courseId).maxTimeMS(5000);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const teacher = await Teacher.findById(resolvedTeacherId)
      .populate({
        path: 'userId',
        select: 'firstName lastName email'
      })
      .lean()
      .maxTimeMS(5000);
    
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
      })
      .lean()
      .maxTimeMS(5000);

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
    console.error('Assign teacher error:', error.message);
    throw error;
  }
};

const getCourseStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments().maxTimeMS(5000);
    const activeCourses = await Course.countDocuments({ status: 'active' }).maxTimeMS(5000);
    const upcomingCourses = await Course.countDocuments({ status: 'upcoming' }).maxTimeMS(5000);
    const completedCourses = await Course.countDocuments({ status: 'completed' }).maxTimeMS(5000);

    const byDepartment = await Course.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).maxTimeMS(5000);

    const byLevel = await Course.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).maxTimeMS(5000);

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
    ]).maxTimeMS(5000);

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
    console.error('Get course stats error:', error.message);
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