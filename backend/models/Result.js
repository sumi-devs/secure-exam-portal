const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
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
    submissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Submission',
        required: true
    },
    totalMarks: Number,
    marksObtained: Number,
    percentage: Number,
    grade: String,
    status: {
        type: String,
        enum: ['pending', 'published']
        // No default - old results will have undefined status and be treated as published
    },
    gradedAnswers: [{
        questionIndex: Number,
        studentAnswer: String,
        isCorrect: Boolean,
        marksObtained: Number,
        requiresManualGrading: Boolean,
        feedback: String
    }],
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    gradedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Result', resultSchema);
