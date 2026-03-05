const { Teacher, User } = require('../models');
const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

const addTeacher = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password,
      employeeId,
      qualification,
      specialization,
      experience,
      dateOfBirth,
      gender,
      contactNumber,
      emergencyContact,
      address,
      joiningDate,
      status,
      bio
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError('Email already in use');
    }

    const existingTeacher = await Teacher.findOne({ employeeId });
    if (existingTeacher) {
      throw new BadRequestError('Employee ID already exists');
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: password || 'teacher123',
      role: 'teacher'
    });

    const teacher = await Teacher.create({
      userId: user._id,
      employeeId,
      qualification,
      specialization,
      experience: experience || 0,
      dateOfBirth,
      gender,
      contactNumber,
      emergencyContact,
      address,
      joiningDate: joiningDate || Date.now(),
      status: status || 'active',
      bio
    });

    await teacher.populate('userId', '-password');

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Teacher added successfully',
      data: teacher
    });
  } catch (error) {
    console.error('Add teacher error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new BadRequestError(`${field} already exists`);
    }
    throw error;
  }
};

const getAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, specialization, status } = req.query;

    const query = {};
    if (specialization) query.specialization = { $regex: specialization, $options: 'i' };
    if (status) query.status = status;

    let userIds = [];
    if (search) {
      const users = await User.find({
        role: 'teacher',
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      userIds = users.map(u => u._id);
      if (userIds.length > 0) {
        query.userId = { $in: userIds };
      } else {
        const teacherSearch = await Teacher.find({
          $or: [
            { employeeId: { $regex: search, $options: 'i' } },
            { qualification: { $regex: search, $options: 'i' } },
            { specialization: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        
        const teacherIds = teacherSearch.map(t => t._id);
        if (teacherIds.length > 0) {
          query._id = { $in: teacherIds };
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
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const teachers = await Teacher.find(query)
      .populate({
        path: 'userId',
        select: '-password'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Teacher.countDocuments(query);

    res.status(StatusCodes.OK).json({
      success: true,
      count: teachers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: teachers
    });
  } catch (error) {
    console.error('Get all teachers error:', error);
    throw error;
  }
};

const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id)
      .populate({
        path: 'userId',
        select: '-password'
      });

    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Get teacher by id error:', error);
    throw error;
  }
};

const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    if (updateData.employeeId && updateData.employeeId !== teacher.employeeId) {
      const existingTeacher = await Teacher.findOne({ 
        employeeId: updateData.employeeId,
        _id: { $ne: id }
      });
      if (existingTeacher) {
        throw new BadRequestError('Employee ID already exists');
      }
    }

    if (updateData.firstName || updateData.lastName || updateData.email) {
      const userUpdate = {};
      if (updateData.firstName) userUpdate.firstName = updateData.firstName;
      if (updateData.lastName) userUpdate.lastName = updateData.lastName;
      if (updateData.email) {
        const existingUser = await User.findOne({ 
          email: updateData.email,
          _id: { $ne: teacher.userId }
        });
        if (existingUser) {
          throw new BadRequestError('Email already in use');
        }
        userUpdate.email = updateData.email;
      }

      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(teacher.userId, userUpdate, {
          returnDocument: 'after',
          runValidators: true
        });
      }
    }

    const teacherUpdate = { ...updateData };
    delete teacherUpdate.firstName;
    delete teacherUpdate.lastName;
    delete teacherUpdate.email;
    delete teacherUpdate.password;

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      teacherUpdate,
      { returnDocument: 'after', runValidators: true }
    ).populate({
      path: 'userId',
      select: '-password'
    }).lean();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Teacher updated successfully',
      data: updatedTeacher
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new BadRequestError(`${field} already exists`);
    }
    throw error;
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    const Course = require('../models/Course');
    const assignedCourses = await Course.find({ teacherId: id });
    if (assignedCourses.length > 0) {
      throw new BadRequestError('Cannot delete teacher with assigned courses. Please reassign courses first.');
    }

    await User.findByIdAndDelete(teacher.userId);
    await teacher.deleteOne();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    throw error;
  }
};

const getTeacherStats = async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments();
    const activeTeachers = await Teacher.countDocuments({ status: 'active' });
    const onLeaveTeachers = await Teacher.countDocuments({ status: 'on-leave' });
    
    const specializationStats = await Teacher.aggregate([
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        total: totalTeachers,
        active: activeTeachers,
        onLeave: onLeaveTeachers,
        bySpecialization: specializationStats
      }
    });
  } catch (error) {
    console.error('Get teacher stats error:', error);
    throw error;
  }
};



module.exports = {
  addTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeacherStats
};