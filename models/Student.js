const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    age: {
        type: Number,
        min: 1,
        max: 100
    },
    contactNumber: {
        type: String
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    parentName: {
        type: String
    },
    parentContact: {
        type: String
    },
    class: {
        type: String,
        required: true
    },
    section: {
        type: String
    },
    rollNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    admissionDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'graduated', 'suspended'],
        default: 'active'
    },
    profilePicture: {
        type: String
    }
}, {
    timestamps: true
});

StudentSchema.virtual('fullName').get(function () {
    return this.userId ? `${this.userId.firstName} ${this.userId.lastName}` : '';
});

module.exports = mongoose.model('Student', StudentSchema);