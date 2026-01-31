import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function Dashboard({ user }) {
    const [stats, setStats] = useState({
        totalExams: 0,
        completedExams: 0,
        pendingExams: 0
    });
    const [recentExams, setRecentExams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const examsResponse = await axios.get(`${API_URL}/exams/exams`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const exams = examsResponse.data.exams || [];
            setRecentExams(exams.slice(0, 5));

            if (user?.role === 'student') {
                setStats({
                    totalExams: exams.length,
                    completedExams: exams.filter(e => e.enrollmentStatus === 'completed').length,
                    pendingExams: exams.filter(e => e.enrollmentStatus === 'enrolled').length
                });
            } else {
                setStats({
                    totalExams: exams.length,
                    completedExams: 0,
                    pendingExams: 0
                });
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error);
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
                <div>
                    <h1>Welcome, {user?.username}</h1>
                    <p>Here's your exam portal overview</p>
                </div>
                {(user?.role === 'instructor' || user?.role === 'admin') && (
                    <Link to="/create-exam" className="btn btn-primary">
                        Create Exam
                    </Link>
                )}
            </div>

            <div className="stats-row">
                <div className="stat-card primary">
                    <div>
                        <h3>{stats.totalExams}</h3>
                        <p>{user?.role === 'student' ? 'Enrolled Exams' : 'Total Exams'}</p>
                    </div>
                </div>

                {user?.role === 'student' && (
                    <>
                        <div className="stat-card success">
                            <div>
                                <h3>{stats.completedExams}</h3>
                                <p>Completed</p>
                            </div>
                        </div>

                        <div className="stat-card warning">
                            <div>
                                <h3>{stats.pendingExams}</h3>
                                <p>Pending</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Exams</h3>
                </div>

                {recentExams.length === 0 ? (
                    <p className="text-muted">No exams available yet.</p>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Exam Title</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentExams.map((exam) => {
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
                                        <tr key={exam._id}>
                                            <td><strong>{exam.title}</strong></td>
                                            <td>{startTime.toLocaleString()}</td>
                                            <td>{endTime.toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${statusClass}`}>{status}</span>
                                            </td>
                                            <td>
                                                {user?.role === 'student' && status === 'In Progress' && (
                                                    <Link to={`/take-exam/${exam._id}`} className="btn btn-primary btn-sm">
                                                        Take Exam
                                                    </Link>
                                                )}
                                                {user?.role === 'student' && status !== 'Completed' && (
                                                    <Link to={`/admit-card/${exam._id}`} className="btn btn-secondary btn-sm" style={{ marginLeft: '4px' }}>
                                                        Admit Card
                                                    </Link>
                                                )}
                                                {(user?.role === 'instructor' || user?.role === 'admin') && (
                                                    <Link to={`/exam/${exam._id}/submissions`} className="btn btn-secondary btn-sm">
                                                        Submissions
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {user?.role === 'student' && recentExams.length > 0 && (
                    <div className="mt-2">
                        <Link to="/exams" className="btn btn-secondary btn-sm">
                            View All Exams
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
