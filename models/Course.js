const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide course name'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Please provide course code'],
        unique: true,
        uppercase: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please provide course description']
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
    },
    credits: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    },
    duration: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    syllabus: {
        type: String
    },
    prerequisites: [{
        type: String
    }],
    maxStudents: {
        type: Number,
        default: 50
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'upcoming', 'completed'],
        default: 'active'
    }
}, {
    timestamps: true
});

CourseSchema.virtual('enrolledCount', {
    ref: 'Enrollment',
    localField: '_id',
    foreignField: 'courseId',
    count: true
});

CourseSchema.virtual('teacherName', {
    ref: 'Teacher',
    localField: 'teacherId',
    foreignField: '_id',
    justOne: true,
    options: { select: 'userId' }
});

module.exports = mongoose.model('Course', CourseSchema);