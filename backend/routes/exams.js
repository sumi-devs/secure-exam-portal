const express = require('express');
const { authenticate } = require('../middleware/authentication');
const { checkPermission, requireRole } = require('../middleware/authorization');

const Exam = require('../models/Exam');
const ExamEnrollment = require('../models/ExamEnrollment');
const Submission = require('../models/Submission');
const Result = require('../models/Result');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const { encryptExamQuestions, decryptExamQuestions, encryptStudentAnswers, decryptStudentAnswers } = require('../utils/encryptionService');
const { generateExamContentHash, generateSubmissionHash } = require('../utils/hashService');
const { encodeExamResponse } = require('../utils/encodingService');
const { generateAdmitCardQR } = require('../utils/qrcodeService');
const { gradeSubmission, assignGrade } = require('../utils/gradingService');

const router = express.Router();

// ==================== CREATE EXAM (Instructor) ====================
router.post('/exam', authenticate, checkPermission('exam', 'create'), async (req, res) => {
    try {
        const { title, description, startTime, endTime, totalMarks, passingMarks, questions } = req.body;

        // Validate inputs
        if (!title || !questions || questions.length === 0) {
            return res.status(400).json({ message: 'Title and questions are required' });
        }

        // Encrypt questions
        const encryptedQuestions = encryptExamQuestions(questions);

        // Hash exam content for integrity
        const contentHash = generateExamContentHash(questions);

        const exam = new Exam({
            title,
            description,
            questionsEncrypted: encryptedQuestions,
            contentHash,
            instructorId: req.user.userId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            totalMarks: totalMarks || 100,
            passingMarks: passingMarks || 40
        });

        await exam.save();

        // Log action
        await AuditLog.create({
            userId: req.user.userId,
            action: 'create_exam',
            resourceType: 'exam',
            resourceId: exam._id,
            status: 'success',
            timestamp: new Date()
        });

        res.status(201).json({
            message: 'Exam created successfully',
            examId: exam._id,
            exam: {
                id: exam._id,
                title: exam.title,
                startTime: exam.startTime,
                endTime: exam.endTime,
                totalMarks: exam.totalMarks
            }
        });
    } catch (error) {
        console.error('Create exam error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== GET ALL EXAMS (Instructor sees own, Student sees enrolled) ====================
router.get('/exams', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;

        let exams;

        if (userRole === 'admin') {
            exams = await Exam.find().populate('instructorId', 'username').sort({ createdAt: -1 });
        } else if (userRole === 'instructor') {
            exams = await Exam.find({ instructorId: userId }).sort({ createdAt: -1 });
        } else {
            // Student sees enrolled exams
            const enrollments = await ExamEnrollment.find({ studentId: userId }).populate({
                path: 'examId',
                populate: { path: 'instructorId', select: 'username' }
            });
            exams = enrollments.map(e => ({ ...e.examId.toObject(), enrollmentStatus: e.status }));
        }

        res.json({ exams });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET EXAM QUESTIONS (For taking exam) ====================
router.get('/exam/:examId/questions', authenticate, checkPermission('exam', 'view'), async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.examId);

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // Decrypt exam questions
        const decryptedQuestions = decryptExamQuestions(exam.questionsEncrypted);

        // Remove correct answers from questions for students
        const questionsForStudent = decryptedQuestions.map((q, idx) => ({
            index: idx,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options || [],
            marks: q.marks
        }));

        const examResponse = {
            examId: exam._id,
            title: exam.title,
            description: exam.description,
            duration: Math.floor((exam.endTime - exam.startTime) / 60000), // minutes
            totalMarks: exam.totalMarks,
            endTime: exam.endTime,
            questions: questionsForStudent
        };

        // Encode response as Base64
        const encodedResponse = encodeExamResponse(examResponse);

        res.json({
            data: encodedResponse,
            message: 'Exam questions retrieved successfully'
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== ENROLL STUDENT (Instructor) ====================
router.post('/exam/:examId/enroll-student', authenticate, requireRole('instructor', 'admin'), async (req, res) => {
    try {
        const { studentId } = req.body;
        const examId = req.params.examId;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // Verify instructor created this exam (or admin)
        if (req.user.role === 'instructor' && exam.instructorId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Check if student exists
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(400).json({ message: 'Invalid student ID' });
        }

        // Check if already enrolled
        const existingEnrollment = await ExamEnrollment.findOne({ studentId, examId });
        if (existingEnrollment) {
            return res.status(400).json({ message: 'Student already enrolled' });
        }

        // Create enrollment
        const enrollment = new ExamEnrollment({
            studentId,
            examId
        });

        await enrollment.save();

        res.json({ message: 'Student enrolled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== BULK ENROLL STUDENTS ====================
router.post('/exam/:examId/enroll-students', authenticate, requireRole('instructor', 'admin'), async (req, res) => {
    try {
        const { studentIds } = req.body;
        const examId = req.params.examId;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        if (req.user.role === 'instructor' && exam.instructorId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const results = { enrolled: [], failed: [] };

        for (const studentId of studentIds) {
            try {
                const student = await User.findById(studentId);
                if (!student || student.role !== 'student') {
                    results.failed.push({ studentId, reason: 'Invalid student' });
                    continue;
                }

                const existing = await ExamEnrollment.findOne({ studentId, examId });
                if (existing) {
                    results.failed.push({ studentId, reason: 'Already enrolled' });
                    continue;
                }

                await ExamEnrollment.create({ studentId, examId });
                results.enrolled.push(studentId);
            } catch (err) {
                results.failed.push({ studentId, reason: err.message });
            }
        }

        res.json({ message: 'Bulk enrollment complete', results });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET STUDENTS LIST (for enrollment) ====================
router.get('/students', authenticate, requireRole('instructor', 'admin'), async (req, res) => {
    try {
        const students = await User.find({ role: 'student', isActive: true })
            .select('_id username email')
            .sort({ username: 1 });

        res.json({ students });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== SUBMIT EXAM ====================
router.post('/exam/:examId/submit', authenticate, checkPermission('submission', 'create'), async (req, res) => {
    try {
        const studentId = req.user.userId;
        const examId = req.params.examId;
        const { answers } = req.body;

        // Verify student is enrolled
        const enrollment = await ExamEnrollment.findOne({ studentId, examId });
        if (!enrollment) {
            return res.status(403).json({ message: 'Not enrolled in this exam' });
        }

        if (enrollment.status === 'completed') {
            return res.status(400).json({ message: 'You have already submitted this exam' });
        }

        // Verify exam is still open
        const exam = await Exam.findById(examId);
        const now = new Date();
        const graceEndTime = new Date(exam.endTime.getTime() + 5 * 60000);

        if (now < exam.startTime || now > graceEndTime) {
            return res.status(400).json({ message: 'Exam submission window closed' });
        }

        // Encrypt answers
        const encryptedAnswers = encryptStudentAnswers(answers);

        // Generate hash of answers for integrity
        const answersHash = generateSubmissionHash(answers);

        // Create submission
        const submission = new Submission({
            studentId,
            examId,
            answersEncrypted: encryptedAnswers,
            answersHash,
            submittedAt: new Date()
        });

        await submission.save();

        // Update enrollment status
        enrollment.status = 'completed';
        await enrollment.save();

        // Auto-grade submission
        const decryptedQuestions = decryptExamQuestions(exam.questionsEncrypted);
        const { totalMarks, earnedMarks, percentage, gradedAnswers, requiresManualGrading } = gradeSubmission(decryptedQuestions, answers);
        const grade = assignGrade(percentage);

        // Create result - status is pending if manual grading required
        const result = new Result({
            studentId,
            examId,
            submissionId: submission._id,
            totalMarks,
            marksObtained: earnedMarks,
            percentage,
            grade,
            gradedAnswers,
            status: requiresManualGrading ? 'pending' : 'published',
            gradedAt: new Date()
        });

        await result.save();

        // Mark submission as graded if no manual grading needed
        if (!requiresManualGrading) {
            submission.graded = true;
            submission.gradedAt = new Date();
            await submission.save();
        }

        // Log submission
        await AuditLog.create({
            userId: studentId,
            action: 'submit_exam',
            resourceType: 'submission',
            resourceId: submission._id,
            status: 'success',
            timestamp: new Date()
        });

        res.json({
            message: 'Exam submitted successfully',
            submissionId: submission._id,
            requiresManualGrading
        });
    } catch (error) {
        console.error('Submit exam error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== GET EXAM SUBMISSIONS (Instructor) ====================
router.get('/exam/:examId/submissions', authenticate, requireRole('instructor', 'admin'), async (req, res) => {
    try {
        const examId = req.params.examId;
        const exam = await Exam.findById(examId);

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        if (req.user.role === 'instructor' && exam.instructorId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const submissions = await Submission.find({ examId })
            .populate('studentId', 'username email')
            .sort({ submittedAt: -1 });

        const results = await Result.find({ examId });
        const resultMap = {};
        results.forEach(r => {
            resultMap[r.studentId.toString()] = r;
        });

        const submissionsWithResults = submissions.map(s => ({
            ...s.toObject(),
            result: resultMap[s.studentId._id.toString()] || null
        }));

        res.json({ submissions: submissionsWithResults });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get detailed submission for grading
router.get('/exam/:examId/submission/:submissionId', authenticate, requireRole('instructor', 'admin'), async (req, res) => {
    try {
        const { examId, submissionId } = req.params;

        const submission = await Submission.findById(submissionId).populate('studentId', 'username email');
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        if (req.user.role === 'instructor' && exam.instructorId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const decryptedQuestions = decryptExamQuestions(exam.questionsEncrypted);
        const decryptedAnswers = decryptStudentAnswers(submission.answersEncrypted);

        const result = await Result.findOne({ submissionId: submission._id });

        const answers = decryptedQuestions.map((q, idx) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            maxMarks: q.marks,
            studentAnswer: decryptedAnswers[idx] || '',
            correctAnswer: q.correctAnswer,
            isCorrect: result?.gradedAnswers?.[idx]?.isCorrect || false,
            marksAwarded: result?.gradedAnswers?.[idx]?.marksObtained || 0,
            requiresManualGrading: q.questionType === 'short_answer' || q.questionType === 'essay',
            feedback: result?.gradedAnswers?.[idx]?.feedback || ''
        }));

        res.json({
            submission: {
                _id: submission._id,
                studentId: submission.studentId,
                submittedAt: submission.submittedAt,
                graded: submission.graded,
                answers
            }
        });
    } catch (error) {
        console.error('Get submission error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Grade submission (Manual grading for essay/short answer)
router.post('/exam/:examId/grade', authenticate, requireRole('instructor', 'admin'), async (req, res) => {
    try {
        const { submissionId, grades } = req.body;
        const examId = req.params.examId;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        if (req.user.role === 'instructor' && exam.instructorId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const submission = await Submission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        let result = await Result.findOne({ submissionId });
        if (!result) {
            return res.status(404).json({ message: 'Result not found' });
        }

        // Apply manual grades
        let manualMarks = 0;
        Object.keys(grades).forEach(questionIdx => {
            const idx = parseInt(questionIdx);
            if (result.gradedAnswers[idx]) {
                result.gradedAnswers[idx].marksObtained = grades[questionIdx].marksAwarded;
                result.gradedAnswers[idx].feedback = grades[questionIdx].feedback || '';
                result.gradedAnswers[idx].requiresManualGrading = false;
                manualMarks += grades[questionIdx].marksAwarded;
            }
        });

        // Recalculate total
        let newTotal = 0;
        result.gradedAnswers.forEach(ga => {
            newTotal += ga.marksObtained || 0;
        });

        result.marksObtained = newTotal;
        result.percentage = result.totalMarks > 0 ? (newTotal / result.totalMarks) * 100 : 0;
        result.grade = assignGrade(result.percentage);
        result.status = 'published';
        result.gradedBy = req.user.userId;
        result.gradedAt = new Date();
        await result.save();

        submission.graded = true;
        submission.gradedBy = req.user.userId;
        submission.gradedAt = new Date();
        await submission.save();

        await AuditLog.create({
            userId: req.user.userId,
            action: 'grade_exam',
            resourceType: 'submission',
            resourceId: submission._id,
            status: 'success',
            timestamp: new Date()
        });

        res.json({
            message: 'Grades submitted successfully',
            result: {
                marksObtained: result.marksObtained,
                totalMarks: result.totalMarks,
                percentage: result.percentage,
                grade: result.grade
            }
        });
    } catch (error) {
        console.error('Grade error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Legacy grading endpoint
router.post('/submission/:submissionId/grade', authenticate, requireRole('instructor', 'admin'), async (req, res) => {
    try {
        const { manualGrades } = req.body;

        const submission = await Submission.findById(req.params.submissionId).populate('examId');
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        if (req.user.role === 'instructor' && submission.examId.instructorId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        let result = await Result.findOne({ submissionId: submission._id });
        if (!result) {
            return res.status(404).json({ message: 'Result not found' });
        }

        let additionalMarks = 0;
        if (manualGrades && manualGrades.length > 0) {
            manualGrades.forEach(({ questionIndex, marks }) => {
                const gradedAnswer = result.gradedAnswers[questionIndex];
                if (gradedAnswer && gradedAnswer.requiresManualGrading) {
                    gradedAnswer.marksObtained = marks;
                    gradedAnswer.requiresManualGrading = false;
                    additionalMarks += marks;
                }
            });
        }

        result.marksObtained += additionalMarks;
        result.percentage = (result.marksObtained / result.totalMarks) * 100;
        result.grade = assignGrade(result.percentage);
        result.gradedBy = req.user.userId;
        result.gradedAt = new Date();
        await result.save();

        submission.graded = true;
        submission.gradedBy = req.user.userId;
        submission.gradedAt = new Date();
        await submission.save();

        await AuditLog.create({
            userId: req.user.userId,
            action: 'grade_exam',
            resourceType: 'submission',
            resourceId: submission._id,
            status: 'success',
            timestamp: new Date()
        });

        res.json({
            message: 'Exam graded successfully',
            result: {
                marksObtained: result.marksObtained,
                totalMarks: result.totalMarks,
                percentage: result.percentage,
                grade: result.grade
            }
        });
    } catch (error) {
        console.error('Grade error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== GET ADMIT CARD ====================
router.get('/exam/:examId/admit-card', authenticate, async (req, res) => {
    try {
        const studentId = req.user.userId;
        const examId = req.params.examId;

        // Check enrollment
        const enrollment = await ExamEnrollment.findOne({ studentId, examId });
        if (!enrollment) {
            return res.status(403).json({ message: 'Not enrolled in this exam' });
        }

        const student = await User.findById(studentId);
        const exam = await Exam.findById(examId);

        const studentData = {
            studentId: student._id.toString(),
            studentName: student.username,
            examId: exam._id.toString(),
            examName: exam.title,
            examDate: exam.startTime.toLocaleDateString(),
            examTime: exam.startTime.toLocaleTimeString()
        };

        const qrCode = await generateAdmitCardQR(studentData);

        res.json({
            studentName: student.username,
            studentEmail: student.email,
            studentId: student._id,
            examName: exam.title,
            examDate: exam.startTime,
            examEndTime: exam.endTime,
            qrCode
        });
    } catch (error) {
        console.error('Admit card error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== VERIFY ADMIT CARD (Public) ====================
router.get('/verify-admit/:examId/:studentId', async (req, res) => {
    try {
        const { examId, studentId } = req.params;

        const enrollment = await ExamEnrollment.findOne({ studentId, examId });
        if (!enrollment) {
            return res.status(404).json({ message: 'Invalid admit card - not enrolled' });
        }

        const student = await User.findById(studentId);
        const exam = await Exam.findById(examId);

        if (!student || !exam) {
            return res.status(404).json({ message: 'Invalid admit card' });
        }

        res.json({
            verified: true,
            studentName: student.username,
            studentEmail: student.email,
            studentId: student._id,
            examName: exam.title,
            examStart: exam.startTime,
            examEnd: exam.endTime
        });
    } catch (error) {
        console.error('Verify admit error:', error);
        res.status(500).json({ message: 'Verification failed' });
    }
});

module.exports = router;
