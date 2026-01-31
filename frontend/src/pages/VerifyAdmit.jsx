import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function VerifyAdmit() {
    const { examId, studentId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        verifyAdmitCard();
    }, [examId, studentId]);

    const verifyAdmitCard = async () => {
        try {
            const response = await axios.get(`${API_URL}/exams/verify-admit/${examId}/${studentId}`);
            setData(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="verify-container">
                <div className="verify-card text-center">
                    <div className="loading-spinner" style={{ margin: '20px auto' }}></div>
                    <p>Verifying admit card...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="verify-container">
                <div className="verify-card">
                    <div className="verify-header error">
                        <h1>Verification Failed</h1>
                    </div>
                    <div className="verify-body">
                        <p style={{ color: 'var(--danger)', fontSize: '16px' }}>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="verify-container">
            <div className="verify-card">
                <div className="verify-header">
                    <h1>Admit Card Verified</h1>
                    <p>Valid Examination Entry</p>
                </div>

                <div className="verify-body">
                    <div className="verify-status">
                        This admit card is valid and verified.
                    </div>

                    <div className="verify-section">
                        <h3>Student Information</h3>
                        <div className="verify-grid">
                            <div className="verify-field">
                                <label>Name</label>
                                <span>{data.studentName}</span>
                            </div>
                            <div className="verify-field">
                                <label>Email</label>
                                <span>{data.studentEmail}</span>
                            </div>
                            <div className="verify-field full">
                                <label>Student ID</label>
                                <span>{data.studentId}</span>
                            </div>
                        </div>
                    </div>

                    <div className="verify-section">
                        <h3>Examination Details</h3>
                        <div className="verify-grid">
                            <div className="verify-field full">
                                <label>Exam</label>
                                <span>{data.examName}</span>
                            </div>
                            <div className="verify-field">
                                <label>Start Time</label>
                                <span>{new Date(data.examStart).toLocaleString()}</span>
                            </div>
                            <div className="verify-field">
                                <label>End Time</label>
                                <span>{new Date(data.examEnd).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VerifyAdmit;
