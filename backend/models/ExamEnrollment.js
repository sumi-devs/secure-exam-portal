const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['enrolled', 'completed', 'withdrawn'],
        default: 'enrolled'
    }
});

// Compound index to prevent duplicate enrollments
enrollmentSchema.index({ studentId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model('ExamEnrollment', enrollmentSchema);
