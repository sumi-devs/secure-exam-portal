const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    questionsEncrypted: {
        type: String,
        required: true
    },
    contentHash: {
        type: String,
        required: true
    },
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    totalMarks: {
        type: Number,
        default: 100
    },
    passingMarks: {
        type: Number,
        default: 40
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});

module.exports = mongoose.model('Exam', examSchema);
