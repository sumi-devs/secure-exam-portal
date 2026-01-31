const express = require('express');
const { authenticate } = require('../middleware/authentication');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');

const router = express.Router();

// Get my results (Student)
router.get('/my-results', authenticate, async (req, res) => {
    try {
        // Get all results - use lean() to get plain objects without Mongoose defaults
        const allResults = await Result.find({ studentId: req.user.userId })
            .populate('examId', 'title totalMarks passingMarks startTime endTime')
            .sort({ gradedAt: -1 })
            .lean();

        // Pending = explicitly set to 'pending', everything else is graded
        const results = allResults.filter(r => r.status !== 'pending');
        const pendingResults = allResults.filter(r => r.status === 'pending');

        res.json({
            results,
            pendingResults,
            pendingCount: pendingResults.length
        });
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get specific result
router.get('/result/:resultId', authenticate, async (req, res) => {
    try {
        const result = await Result.findById(req.params.resultId)
            .populate('studentId', 'username email')
            .populate('examId', 'title totalMarks passingMarks startTime endTime')
            .lean();

        if (!result) {
            return res.status(404).json({ message: 'Result not found' });
        }

        const userId = req.user.userId;
        const userRole = req.user.role;

        if (userRole === 'student') {
            if (result.studentId._id.toString() !== userId) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
            if (result.status === 'pending') {
                return res.status(403).json({ message: 'Result not yet published' });
            }
        }

        if (userRole === 'instructor') {
            const exam = await Exam.findById(result.examId._id);
            if (exam.instructorId.toString() !== userId) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
        }

        res.json({ result });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get exam results (Instructor)
router.get('/exam/:examId/results', authenticate, async (req, res) => {
    try {
        const examId = req.params.examId;
        const exam = await Exam.findById(examId);

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        if (req.user.role === 'instructor' && exam.instructorId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (req.user.role === 'student') {
            const results = await Result.find({
                examId,
                studentId: req.user.userId,
                status: { $ne: 'pending' }
            }).populate('studentId', 'username email').lean();
            return res.json({ results });
        }

        const results = await Result.find({ examId })
            .populate('studentId', 'username email')
            .sort({ percentage: -1 })
            .lean();

        const gradedResults = results.filter(r => r.status !== 'pending');

        const stats = {
            totalStudents: results.length,
            graded: gradedResults.length,
            pending: results.filter(r => r.status === 'pending').length,
            passed: gradedResults.filter(r => r.percentage >= (exam.passingMarks / exam.totalMarks * 100)).length,
            averagePercentage: gradedResults.length > 0
                ? (gradedResults.reduce((sum, r) => sum + r.percentage, 0) / gradedResults.length).toFixed(2)
                : 0,
            highestScore: gradedResults.length > 0 ? Math.max(...gradedResults.map(r => r.marksObtained)) : 0,
            lowestScore: gradedResults.length > 0 ? Math.min(...gradedResults.map(r => r.marksObtained)) : 0
        };

        res.json({ results, stats });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
