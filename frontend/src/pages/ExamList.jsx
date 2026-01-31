import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function ExamList({ user }) {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/exams/exams`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExams(response.data.exams || []);
        } catch (error) {
            console.error('Fetch exams error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="dashboard-header">
                <h1>Exams</h1>
                {(user?.role === 'instructor' || user?.role === 'admin') && (
                    <Link to="/create-exam" className="btn btn-primary">
                        Create Exam
                    </Link>
                )}
            </div>

            {exams.length === 0 ? (
                <div className="card text-center">
                    <p className="text-muted">No exams available.</p>
                </div>
            ) : (
                <div className="exam-grid">
                    {exams.map((exam) => {
                        const now = new Date();
                        const startTime = new Date(exam.startTime);
                        const endTime = new Date(exam.endTime);

                        let status = 'Upcoming';
                        let statusClass = 'badge-warning';

                        if (exam.enrollmentStatus === 'completed') {
                            status = 'Completed';
                            statusClass = 'badge-success';
                        } else if (now >= startTime && now <= endTime) {
                            status = 'In Progress';
                            statusClass = 'badge-primary';
                        } else if (now > endTime) {
                            status = 'Ended';
                            statusClass = 'badge-danger';
                        }

                        return (
                            <div key={exam._id} className="exam-card">
                                <div className="flex justify-between items-center mb-1">
                                    <h3>{exam.title}</h3>
                                    <span className={`badge ${statusClass}`}>{status}</span>
                                </div>

                                {exam.description && (
                                    <p className="text-muted mb-2" style={{ fontSize: '13px' }}>{exam.description}</p>
                                )}

                                <div className="meta">
                                    <p>Start: {startTime.toLocaleString()}</p>
                                    <p>End: {endTime.toLocaleString()}</p>
                                    <p>Total Marks: {exam.totalMarks}</p>
                                </div>

                                <div className="actions">
                                    {user?.role === 'student' && status === 'In Progress' && (
                                        <Link to={`/take-exam/${exam._id}`} className="btn btn-primary btn-sm">
                                            Take Exam
                                        </Link>
                                    )}
                                    {user?.role === 'student' && (
                                        <Link to={`/admit-card/${exam._id}`} className="btn btn-secondary btn-sm">
                                            Admit Card
                                        </Link>
                                    )}
                                    {(user?.role === 'instructor' || user?.role === 'admin') && (
                                        <Link to={`/exam/${exam._id}/submissions`} className="btn btn-secondary btn-sm">
                                            Submissions
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default ExamList;
