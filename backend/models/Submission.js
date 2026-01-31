const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
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
    answersEncrypted: {
        type: String,
        required: true
    },
    answersHash: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        required: true
    },
    graded: {
        type: Boolean,
        default: false
    },
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    gradedAt: Date
});

// Compound index to prevent duplicate submissions
submissionSchema.index({ studentId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
