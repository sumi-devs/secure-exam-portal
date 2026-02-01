const express = require('express');
const { authenticate } = require('../middleware/authentication');
const { requireRole } = require('../middleware/authorization');

const User = require('../models/User');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const Result = require('../models/Result');
const ExamEnrollment = require('../models/ExamEnrollment');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// ==================== ADMIN DASHBOARD STATS ====================
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalInstructors = await User.countDocuments({ role: 'instructor' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalExams = await Exam.countDocuments();
        const totalSubmissions = await Submission.countDocuments();

        res.json({
            stats: {
                totalUsers,
                totalStudents,
                totalInstructors,
                totalAdmins,
                totalExams,
                totalSubmissions
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET ALL USERS ====================
router.get('/users', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const users = await User.find()
            .select('-password -otpHash -emailVerificationToken')
            .sort({ createdAt: -1 });

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET ALL INSTRUCTORS ====================
router.get('/instructors', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const instructors = await User.find({ role: 'instructor' })
            .select('_id username email createdAt lastLogin isActive')
            .sort({ username: 1 });

        // Get exam count for each instructor
        const instructorData = await Promise.all(instructors.map(async (instructor) => {
            const examCount = await Exam.countDocuments({ instructorId: instructor._id });
            return {
                ...instructor.toObject(),
                examCount
            };
        }));

        res.json({ instructors: instructorData });
    } catch (error) {
        console.error('Get instructors error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET ALL STUDENTS ====================
router.get('/students', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const students = await User.find({ role: 'student' })
            .select('_id username email createdAt lastLogin isActive')
            .sort({ username: 1 });

        // Get submission count for each student
        const studentData = await Promise.all(students.map(async (student) => {
            const submissionCount = await Submission.countDocuments({ studentId: student._id });
            const enrollmentCount = await ExamEnrollment.countDocuments({ studentId: student._id });
            return {
                ...student.toObject(),
                submissionCount,
                enrollmentCount
            };
        }));

        res.json({ students: studentData });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET ALL EXAMS WITH DETAILS ====================
router.get('/exams', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const exams = await Exam.find()
            .populate('instructorId', 'username email')
            .sort({ createdAt: -1 });

        // Get submission and enrollment counts for each exam
        const examData = await Promise.all(exams.map(async (exam) => {
            const submissionCount = await Submission.countDocuments({ examId: exam._id });
            const enrollmentCount = await ExamEnrollment.countDocuments({ examId: exam._id });
            return {
                _id: exam._id,
                title: exam.title,
                description: exam.description,
                instructor: exam.instructorId,
                startTime: exam.startTime,
                endTime: exam.endTime,
                totalMarks: exam.totalMarks,
                passingMarks: exam.passingMarks,
                createdAt: exam.createdAt,
                submissionCount,
                enrollmentCount
            };
        }));

        res.json({ exams: examData });
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET EXAM PARTICIPANTS (WHO TOOK THE EXAM) ====================
router.get('/exam/:examId/participants', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId).populate('instructorId', 'username email');
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // Get all enrollments with student details
        const enrollments = await ExamEnrollment.find({ examId })
            .populate('studentId', 'username email');

        // Get submissions and results
        const submissions = await Submission.find({ examId });
        const results = await Result.find({ examId });

        const submissionMap = {};
        submissions.forEach(s => {
            submissionMap[s.studentId.toString()] = s;
        });

        const resultMap = {};
        results.forEach(r => {
            resultMap[r.studentId.toString()] = r;
        });

        const participants = enrollments.map(e => {
            const studentId = e.studentId._id.toString();
            const submission = submissionMap[studentId];
            const result = resultMap[studentId];

            return {
                student: e.studentId,
                enrolledAt: e.enrolledAt,
                status: e.status,
                hasSubmitted: !!submission,
                submittedAt: submission?.submittedAt,
                result: result ? {
                    marksObtained: result.marksObtained,
                    totalMarks: result.totalMarks,
                    percentage: result.percentage,
                    grade: result.grade,
                    status: result.status
                } : null
            };
        });

        res.json({
            exam: {
                _id: exam._id,
                title: exam.title,
                instructor: exam.instructorId
            },
            participants
        });
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET AUDIT LOGS ====================
router.get('/audit-logs', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('userId', 'username')
            .sort({ timestamp: -1 })
            .limit(100);

        res.json({ logs });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
