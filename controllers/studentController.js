const { Student, User } = require('../models');
const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

const addStudent = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password,
      dateOfBirth,
      gender,
      contactNumber,
      address,
      parentName,
      parentContact,
      class: studentClass,
      section,
      rollNumber,
      admissionDate,
      status
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError('Email already in use');
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: password || 'student123',
      role: 'student'
    });

    const student = await Student.create({
      userId: user._id,
      dateOfBirth,
      gender,
      contactNumber,
      address,
      parentName,
      parentContact,
      class: studentClass,
      section,
      rollNumber,
      admissionDate: admissionDate || Date.now(),
      status: status || 'active'
    });

    await student.populate('userId', '-password');

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Student added successfully',
      data: student
    });
  } catch (error) {
    console.error('Add student error:', error);
    
    if (error.code === 11000) {
      throw new BadRequestError('Roll number already exists');
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      throw new BadRequestError(messages.join(', '));
    }
    
    throw error;
  }
};

const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, class: studentClass, status } = req.query;

    const query = {};
    if (studentClass) query.class = studentClass;
    if (status) query.status = status;

    if (search && search.trim() !== '') {
      const users = await User.find({
        role: 'student',
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').limit(100);
      
      const userIds = users.map(u => u._id);
      if (userIds.length > 0) {
        query.userId = { $in: userIds };
      } else {
        const studentsByRoll = await Student.find({
          rollNumber: { $regex: search, $options: 'i' }
        }).select('_id').limit(100);
        
        if (studentsByRoll.length > 0) {
          query._id = { $in: studentsByRoll.map(s => s._id) };
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
    
    const students = await Student.find(query)
      .populate({
        path: 'userId',
        select: '-password'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Student.countDocuments(query);

    res.status(StatusCodes.OK).json({
      success: true,
      count: students.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: students
    });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      msg: 'Failed to fetch students'
    });
  }
};

const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid student ID format');
    }

    const student = await Student.findById(id)
      .populate({
        path: 'userId',
        select: '-password'
      });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Get student by id error:', error);
    
    if (error.name === 'CastError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        msg: 'Invalid student ID format'
      });
    }
    
    throw error;
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid student ID format');
    }

    const student = await Student.findById(id);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (updateData.firstName || updateData.lastName || updateData.email) {
      const userUpdate = {};
      if (updateData.firstName) userUpdate.firstName = updateData.firstName;
      if (updateData.lastName) userUpdate.lastName = updateData.lastName;
      if (updateData.email) userUpdate.email = updateData.email;

      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(student.userId, userUpdate, {
          new: true,
          runValidators: true
        });
      }
    }

    const studentUpdate = { ...updateData };
    delete studentUpdate.firstName;
    delete studentUpdate.lastName;
    delete studentUpdate.email;
    delete studentUpdate.password;

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      studentUpdate,
      { new: true, runValidators: true }
    ).populate({
      path: 'userId',
      select: '-password'
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Update student error:', error);
    
    if (error.code === 11000) {
      throw new BadRequestError('Roll number already exists');
    }
    
    throw error;
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError('Invalid student ID format');
    }

    const student = await Student.findById(id);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    await User.findByIdAndDelete(student.userId);
    await student.deleteOne();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    throw error;
  }
};

module.exports = {
  addStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent
};