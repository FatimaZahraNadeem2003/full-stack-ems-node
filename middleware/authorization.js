const { UnauthenticatedError, UnauthorizedError } = require("../errors");
const { Teacher, Student } = require('../models');

/**
 * Generic authorize middleware that checks if user has one of the allowed roles
 * @param  {...string} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new UnauthenticatedError("Authentication required");
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw new UnauthorizedError(
                `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
            );
        }
        
        next();
    };
};

const adminMiddleware = (req, res, next) => {
    if (!req.user) {
        throw new UnauthenticatedError("Authentication required");
    }

    if (req.user.role !== 'admin') {
        throw new UnauthorizedError("Access denied. Admin access required");
    }
    
    next();
};

const teacherMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new UnauthenticatedError("Authentication required");
        }

        if (!['admin', 'teacher'].includes(req.user.role)) {
            throw new UnauthorizedError("Access denied. Teacher access required");
        }

        if (req.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ userId: req.user.userId });
            if (!teacher) {
                throw new UnauthorizedError("Teacher profile not found");
            }
            req.user.teacherId = teacher._id.toString();
            req.user.teacher = teacher;
        }

        if (req.user.role === 'admin' && (req.query.teacherId || req.body.teacherId)) {
            req.user.teacherId = req.query.teacherId || req.body.teacherId;
        }
        
        next();
    } catch (error) {
        next(error);
    }
};

const studentMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new UnauthenticatedError("Authentication required");
        }

        if (!['admin', 'student'].includes(req.user.role)) {
            throw new UnauthorizedError("Access denied. Student access required");
        }

        if (req.user.role === 'student') {
            const student = await Student.findOne({ userId: req.user.userId });
            if (!student) {
                throw new UnauthorizedError("Student profile not found");
            }
            req.user.studentId = student._id.toString();
            req.user.student = student;
        }

        if (req.user.role === 'admin' && (req.query.studentId || req.body.studentId)) {
            req.user.studentId = req.query.studentId || req.body.studentId;
        }
        
        next();
    } catch (error) {
        next(error);
    }
};

const teacherAuth = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new UnauthenticatedError("Authentication required");
        }

        if (req.user.role === 'admin') {
            if (req.query.teacherId || req.body.teacherId) {
                req.user.teacherId = req.query.teacherId || req.body.teacherId;
            }
            return next();
        }

        if (req.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ userId: req.user.userId });
            if (!teacher) {
                throw new UnauthorizedError("Teacher profile not found");
            }
            req.user.teacherId = teacher._id.toString();
            req.user.teacher = teacher;
            return next();
        }

        throw new UnauthorizedError("Access denied. Teacher access required");
    } catch (error) {
        next(error);
    }
};

const studentAuth = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new UnauthenticatedError("Authentication required");
        }

        if (req.user.role === 'admin') {
            if (req.query.studentId || req.body.studentId) {
                req.user.studentId = req.query.studentId || req.body.studentId;
            }
            return next();
        }

        if (req.user.role === 'student') {
            const student = await Student.findOne({ userId: req.user.userId });
            if (!student) {
                throw new UnauthorizedError("Student profile not found");
            }
            req.user.studentId = student._id.toString();
            req.user.student = student;
            return next();
        }

        throw new UnauthorizedError("Access denied. Student access required");
    } catch (error) {
        next(error);
    }
};

const teacherOrStudentAuth = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new UnauthenticatedError("Authentication required");
        }

        if (req.user.role === 'admin') {
            if (req.query.teacherId || req.body.teacherId) {
                req.user.teacherId = req.query.teacherId || req.body.teacherId;
            }
            if (req.query.studentId || req.body.studentId) {
                req.user.studentId = req.query.studentId || req.body.studentId;
            }
            return next();
        }

        if (req.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ userId: req.user.userId });
            if (!teacher) {
                throw new UnauthorizedError("Teacher profile not found");
            }
            req.user.teacherId = teacher._id.toString();
            req.user.teacher = teacher;
            return next();
        }

        if (req.user.role === 'student') {
            const student = await Student.findOne({ userId: req.user.userId });
            if (!student) {
                throw new UnauthorizedError("Student profile not found");
            }
            req.user.studentId = student._id.toString();
            req.user.student = student;
            return next();
        }

        throw new UnauthorizedError("Access denied");
    } catch (error) {
        next(error);
    }
};

/**
 * Check if user owns the resource or is admin
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 */
const authorizeOwnerOrAdmin = (getResourceOwnerId) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new UnauthenticatedError("Authentication required");
            }

            if (req.user.role === 'admin') {
                return next();
            }

            const ownerId = await getResourceOwnerId(req);
            
            if (req.user.role === 'teacher' && req.user.teacherId) {
                if (req.user.teacherId !== ownerId.toString()) {
                    throw new UnauthorizedError("Access denied. You don't own this resource");
                }
            } else if (req.user.role === 'student' && req.user.studentId) {
                if (req.user.studentId !== ownerId.toString()) {
                    throw new UnauthorizedError("Access denied. You don't own this resource");
                }
            } else if (req.user.userId !== ownerId.toString()) {
                throw new UnauthorizedError("Access denied. You don't own this resource");
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    authorize,
    adminMiddleware,
    teacherMiddleware,
    studentMiddleware,
    teacherAuth,
    studentAuth,
    teacherOrStudentAuth,
    authorizeOwnerOrAdmin
};