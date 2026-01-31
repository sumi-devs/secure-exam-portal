import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function ExamSubmissions() {
    const { examId } = useParams();
    const [submissions, setSubmissions] = useState([]);
    const [examTitle, setExamTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [gradingData, setGradingData] = useState({});
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchSubmissions();
    }, [examId]);

    const fetchSubmissions = async () => {
        try {
            const token = localStorage.getItem('token');

            const subResponse = await axios.get(`${API_URL}/exams/exam/${examId}/submissions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubmissions(subResponse.data.submissions || []);

            try {
                const resResponse = await axios.get(`${API_URL}/results/exam/${examId}/results`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(resResponse.data.stats);
            } catch (e) {
                // Results may not exist
            }

            if (subResponse.data.submissions?.length > 0) {
                setExamTitle(subResponse.data.submissions[0].examId?.title || 'Exam');
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSubmission = async (submission) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_URL}/exams/exam/${examId}/submission/${submission._id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const detailedSubmission = response.data.submission;
            setSelectedSubmission(detailedSubmission);

            const initialGradingData = {};
            if (detailedSubmission.answers) {
                detailedSubmission.answers.forEach((answer, idx) => {
                    if (answer.requiresManualGrading) {
                        initialGradingData[idx] = {
                            marksAwarded: answer.marksAwarded || 0,
                            feedback: answer.feedback || ''
                        };
                    }
                });
            }
            setGradingData(initialGradingData);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load submission' });
        }
    };

    const handleGradeChange = (questionIdx, field, value) => {
        setGradingData(prev => ({
            ...prev,
            [questionIdx]: {
                ...prev[questionIdx],
                [field]: field === 'marksAwarded' ? parseInt(value) || 0 : value
            }
        }));
    };

    const handleSubmitGrades = async () => {
        try {
            const token = localStorage.getItem('token');

            await axios.post(`${API_URL}/exams/exam/${examId}/grade`, {
                submissionId: selectedSubmission._id,
                grades: gradingData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: 'Grades submitted!' });
            setSelectedSubmission(null);
            fetchSubmissions();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to submit'
            });
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (selectedSubmission) {
        const hasManualQuestions = selectedSubmission.answers?.some(a => a.requiresManualGrading);

        return (
            <div className="exam-container">
                <div className="dashboard-header">
                    <h1>Grade Submission</h1>
                    <button onClick={() => setSelectedSubmission(null)} className="btn btn-secondary">
                        Back
                    </button>
                </div>

                <div className="card mb-2">
                    <p><strong>Student:</strong> {selectedSubmission.studentId?.username} ({selectedSubmission.studentId?.email})</p>
                    <p><strong>Submitted:</strong> {new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                </div>

                {message.text && (
                    <div className={`alert alert-${message.type}`}>
                        {message.text}
                    </div>
                )}

                {selectedSubmission.answers?.map((answer, idx) => (
                    <div key={idx} className="question-card">
                        <div className="question-header">
                            <span className="question-number">Q{idx + 1}</span>
                            <span className="question-marks">{answer.maxMarks} marks</span>
                        </div>
                        <p className="question-text">{answer.questionText}</p>

                        <div style={{ background: '#fafafa', padding: '10px', marginBottom: '10px', fontSize: '13px' }}>
                            <strong>Answer:</strong> {answer.studentAnswer || '(No answer)'}
                        </div>

                        {answer.questionType === 'multiple_choice' || answer.questionType === 'true_false' ? (
                            <div>
                                <span className={`badge ${answer.isCorrect ? 'badge-success' : 'badge-danger'}`}>
                                    {answer.isCorrect ? 'Correct' : 'Incorrect'} ({answer.marksAwarded}/{answer.maxMarks})
                                </span>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Marks (max {answer.maxMarks})</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        max={answer.maxMarks}
                                        value={gradingData[idx]?.marksAwarded || 0}
                                        onChange={(e) => handleGradeChange(idx, 'marksAwarded', e.target.value)}
                                    />
                                </div>
                                <div style={{ flex: 2 }}>
                                    <label className="form-label">Feedback</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={gradingData[idx]?.feedback || ''}
                                        onChange={(e) => handleGradeChange(idx, 'feedback', e.target.value)}
                                        placeholder="Optional feedback"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {hasManualQuestions && (
                    <button onClick={handleSubmitGrades} className="btn btn-primary btn-lg">
                        Submit Grades
                    </button>
                )}
            </div>
        );
    }

    return (
        <div>
            <div className="dashboard-header">
                <div>
                    <h1>Submissions</h1>
                    <p>{examTitle}</p>
                </div>
                <Link to="/dashboard" className="btn btn-secondary">
                    Back
                </Link>
            </div>

            {stats && (
                <div className="stats-row">
                    <div className="stat-card primary">
                        <div>
                            <h3>{stats.totalStudents}</h3>
                            <p>Submissions</p>
                        </div>
                    </div>
                    <div className="stat-card success">
                        <div>
                            <h3>{stats.passed}</h3>
                            <p>Passed</p>
                        </div>
                    </div>
                    <div className="stat-card warning">
                        <div>
                            <h3>{stats.averagePercentage || 0}%</h3>
                            <p>Average</p>
                        </div>
                    </div>
                </div>
            )}

            {submissions.length === 0 ? (
                <div className="card text-center">
                    <p className="text-muted">No submissions yet.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Email</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((submission) => (
                                <tr key={submission._id}>
                                    <td><strong>{submission.studentId?.username}</strong></td>
                                    <td>{submission.studentId?.email}</td>
                                    <td>{new Date(submission.submittedAt).toLocaleString()}</td>
                                    <td>
                                        <span className={`badge ${submission.graded ? 'badge-success' : 'badge-warning'}`}>
                                            {submission.graded ? 'Graded' : 'Pending'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleSelectSubmission(submission)}
                                            className="btn btn-primary btn-sm"
                                        >
                                            {submission.graded ? 'View' : 'Grade'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ExamSubmissions;
