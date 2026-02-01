import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function AdminDashboard({ user }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'instructors') fetchInstructors();
        if (activeTab === 'students') fetchStudents();
        if (activeTab === 'exams') fetchExams();
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/stats`, { headers });
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/users`, { headers });
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchInstructors = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/instructors`, { headers });
            setInstructors(response.data.instructors);
        } catch (error) {
            console.error('Error fetching instructors:', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/students`, { headers });
            setStudents(response.data.students);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const fetchExams = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/exams`, { headers });
            setExams(response.data.exams);
        } catch (error) {
            console.error('Error fetching exams:', error);
        }
    };

    const fetchParticipants = async (examId) => {
        try {
            const response = await axios.get(`${API_URL}/admin/exam/${examId}/participants`, { headers });
            setSelectedExam(response.data.exam);
            setParticipants(response.data.participants);
        } catch (error) {
            console.error('Error fetching participants:', error);
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
                    <h1>Admin Dashboard</h1>
                    <p>Welcome, {user?.username}. Manage the entire exam portal from here.</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['overview', 'exams', 'instructors', 'students', 'users'].map(tab => (
                        <button
                            key={tab}
                            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => { setActiveTab(tab); setSelectedExam(null); }}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>


            {activeTab === 'overview' && stats && (
                <div>
                    <div className="stats-row">
                        <div className="stat-card primary">
                            <div>
                                <h3>{stats.totalUsers}</h3>
                                <p>Total Users</p>
                            </div>
                        </div>
                        <div className="stat-card success">
                            <div>
                                <h3>{stats.totalStudents}</h3>
                                <p>Students</p>
                            </div>
                        </div>
                        <div className="stat-card warning">
                            <div>
                                <h3>{stats.totalInstructors}</h3>
                                <p>Instructors</p>
                            </div>
                        </div>
                        <div className="stat-card danger">
                            <div>
                                <h3>{stats.totalAdmins}</h3>
                                <p>Admins</p>
                            </div>
                        </div>
                    </div>
                    <div className="stats-row" style={{ marginTop: '1rem' }}>
                        <div className="stat-card primary">
                            <div>
                                <h3>{stats.totalExams}</h3>
                                <p>Total Exams</p>
                            </div>
                        </div>
                        <div className="stat-card success">
                            <div>
                                <h3>{stats.totalSubmissions}</h3>
                                <p>Total Submissions</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {activeTab === 'exams' && !selectedExam && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">All Exams</h3>
                    </div>
                    {exams.length === 0 ? (
                        <p className="text-muted">No exams created yet.</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Exam Title</th>
                                        <th>Created By</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                        <th>Enrolled</th>
                                        <th>Submitted</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exams.map(exam => (
                                        <tr key={exam._id}>
                                            <td><strong>{exam.title}</strong></td>
                                            <td>{exam.instructor?.username || 'Unknown'}</td>
                                            <td>{new Date(exam.startTime).toLocaleString()}</td>
                                            <td>{new Date(exam.endTime).toLocaleString()}</td>
                                            <td><span className="badge badge-primary">{exam.enrollmentCount}</span></td>
                                            <td><span className="badge badge-success">{exam.submissionCount}</span></td>
                                            <td>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => fetchParticipants(exam._id)}
                                                >
                                                    View Participants
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}


            {activeTab === 'exams' && selectedExam && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            Participants: {selectedExam.title}
                            <span style={{ fontWeight: 'normal', fontSize: '0.9rem', marginLeft: '1rem' }}>
                                (by {selectedExam.instructor?.username})
                            </span>
                        </h3>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedExam(null)}>
                            ← Back to Exams
                        </button>
                    </div>
                    {participants.length === 0 ? (
                        <p className="text-muted">No students enrolled in this exam.</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Email</th>
                                        <th>Enrolled At</th>
                                        <th>Submitted</th>
                                        <th>Marks</th>
                                        <th>Grade</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((p, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{p.student.username}</strong></td>
                                            <td>{p.student.email}</td>
                                            <td>{new Date(p.enrolledAt).toLocaleString()}</td>
                                            <td>
                                                {p.hasSubmitted ? (
                                                    <span className="badge badge-success">✓ Yes</span>
                                                ) : (
                                                    <span className="badge badge-warning">No</span>
                                                )}
                                            </td>
                                            <td>
                                                {p.result ? `${p.result.marksObtained}/${p.result.totalMarks}` : '-'}
                                            </td>
                                            <td>
                                                {p.result ? (
                                                    <span className={`badge badge-${p.result.grade === 'F' ? 'danger' : 'success'}`}>
                                                        {p.result.grade}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td>
                                                {p.result?.status === 'pending' ? (
                                                    <span className="badge badge-warning">Pending Review</span>
                                                ) : p.result?.status === 'published' ? (
                                                    <span className="badge badge-success">Graded</span>
                                                ) : (
                                                    <span className="badge badge-secondary">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}


            {activeTab === 'instructors' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">All Instructors</h3>
                    </div>
                    {instructors.length === 0 ? (
                        <p className="text-muted">No instructors registered yet.</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Exams Created</th>
                                        <th>Registered</th>
                                        <th>Last Login</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {instructors.map(instructor => (
                                        <tr key={instructor._id}>
                                            <td><strong>{instructor.username}</strong></td>
                                            <td>{instructor.email}</td>
                                            <td><span className="badge badge-primary">{instructor.examCount}</span></td>
                                            <td>{new Date(instructor.createdAt).toLocaleDateString()}</td>
                                            <td>{instructor.lastLogin ? new Date(instructor.lastLogin).toLocaleString() : 'Never'}</td>
                                            <td>
                                                <span className={`badge badge-${instructor.isActive ? 'success' : 'danger'}`}>
                                                    {instructor.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}


            {activeTab === 'students' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">All Students</h3>
                    </div>
                    {students.length === 0 ? (
                        <p className="text-muted">No students registered yet.</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Enrolled In</th>
                                        <th>Submissions</th>
                                        <th>Registered</th>
                                        <th>Last Login</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr key={student._id}>
                                            <td><strong>{student.username}</strong></td>
                                            <td>{student.email}</td>
                                            <td><span className="badge badge-primary">{student.enrollmentCount} exams</span></td>
                                            <td><span className="badge badge-success">{student.submissionCount}</span></td>
                                            <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                                            <td>{student.lastLogin ? new Date(student.lastLogin).toLocaleString() : 'Never'}</td>
                                            <td>
                                                <span className={`badge badge-${student.isActive ? 'success' : 'danger'}`}>
                                                    {student.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}


            {activeTab === 'users' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">All Users</h3>
                    </div>
                    {users.length === 0 ? (
                        <p className="text-muted">No users in system.</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Email Verified</th>
                                        <th>MFA Enabled</th>
                                        <th>Registered</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user._id}>
                                            <td><strong>{user.username}</strong></td>
                                            <td>{user.email}</td>
                                            <td>
                                                <span className={`badge badge-${user.role === 'admin' ? 'danger' :
                                                    user.role === 'instructor' ? 'warning' : 'primary'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>{user.emailVerified ? '✓' : '✗'}</td>
                                            <td>{user.mfaEnabled ? '✓' : '✗'}</td>
                                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <span className={`badge badge-${user.isActive ? 'success' : 'danger'}`}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
