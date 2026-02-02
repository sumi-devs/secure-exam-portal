const Exam = require('../models/Exam');
const ExamEnrollment = require('../models/ExamEnrollment');
const Submission = require('../models/Submission');

// role-based permission definitions
const permissions = {
    exam: {
        student: ['view'],
        instructor: ['create', 'view', 'edit', 'delete'],
        admin: ['create', 'view', 'edit', 'delete']
    },
    submission: {
        student: ['create', 'view'],
        instructor: ['view', 'grade'],
        admin: ['view', 'delete']
    },
    results: {
        student: ['view'],
        instructor: ['view', 'edit'],
        admin: ['view', 'edit', 'delete']
    },
    users: {
        student: ['view'],
        instructor: ['view'],
        admin: ['create', 'view', 'edit', 'delete']
    },
    settings: {
        student: [],
        instructor: ['view'],
        admin: ['view', 'edit']
    }
};

const checkPermission = (requiredResource, requiredAction) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;

            if (userRole === 'admin') {
                return next();
            }

            const userPermissions = permissions[requiredResource]?.[userRole] || [];

            if (!userPermissions.includes(requiredAction)) {
                return res.status(403).json({
                    message: 'Unauthorized. You do not have permission to perform this action.'
                });
            }
            if (requiredResource === 'exam' && requiredAction === 'view') {
                const examId = req.params.examId;
                if (examId) {
                    const exam = await Exam.findById(examId);

                    if (!exam) {
                        return res.status(404).json({ message: 'Exam not found' });
                    }

                    if (userRole === 'student') {
                        const enrollment = await ExamEnrollment.findOne({
                            studentId: userId,
                            examId: examId
                        });

                        if (!enrollment) {
                            return res.status(403).json({
                                message: 'You are not enrolled in this exam.'
                            });
                        }

                        const now = new Date();
                        const graceEndTime = new Date(exam.endTime.getTime() + 5 * 60000);

                        if (now < exam.startTime || now > graceEndTime) {
                            return res.status(403).json({
                                message: 'Exam is not available at this time.'
                            });
                        }
                    }

                    if (userRole === 'instructor') {
                        if (exam.instructorId.toString() !== userId) {
                            return res.status(403).json({
                                message: 'You can only view exams you created.'
                            });
                        }
                    }
                }
            }

            if (requiredResource === 'submission' && requiredAction === 'view') {
                const submissionId = req.params.submissionId;
                if (submissionId) {
                    const submission = await Submission.findById(submissionId).populate('examId');

                    if (!submission) {
                        return res.status(404).json({ message: 'Submission not found' });
                    }

                    if (userRole === 'student') {

                        if (submission.studentId.toString() !== userId) {
                            return res.status(403).json({
                                message: 'You can only view your own submissions.'
                            });
                        }

                        const now = new Date();
                        if (now < submission.examId.endTime) {
                            return res.status(403).json({
                                message: 'You can view results only after exam ends.'
                            });
                        }
                    }

                    if (userRole === 'instructor') {

                        if (submission.examId.instructorId.toString() !== userId) {
                            return res.status(403).json({
                                message: 'You can only view submissions for exams you created.'
                            });
                        }
                    }
                }
            }

            next();
        } catch (error) {
            console.error('Authorization error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    };
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Required roles: ${roles.join(', ')}`
            });
        }
        next();
    };
};

module.exports = { checkPermission, requireRole };
