import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function AdmitCard() {
    const { examId } = useParams();
    const [admitCard, setAdmitCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAdmitCard();
    }, [examId]);

    const fetchAdmitCard = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/exams/exam/${examId}/admit-card`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdmitCard(response.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to load admit card');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="exam-container">
                <div className="alert alert-error">{error}</div>
            </div>
        );
    }

    return (
        <div>
            <div className="dashboard-header">
                <h1>Admit Card</h1>
                <button onClick={handlePrint} className="btn btn-primary no-print">
                    Print Admit Card
                </button>
            </div>

            <div className="admit-card-container">
                <div className="admit-card-header">
                    <h2>SECURE EXAM PORTAL</h2>
                    <p>Examination Admit Card</p>
                </div>

                <div className="admit-card-body">
                    <div className="admit-card-info">
                        <div className="admit-card-field">
                            <label>Student Name</label>
                            <span>{admitCard.studentName}</span>
                        </div>
                        <div className="admit-card-field">
                            <label>Student ID</label>
                            <span>{admitCard.studentId}</span>
                        </div>
                        <div className="admit-card-field">
                            <label>Email</label>
                            <span>{admitCard.studentEmail}</span>
                        </div>
                        <div className="admit-card-field">
                            <label>Exam Name</label>
                            <span>{admitCard.examName}</span>
                        </div>
                        <div className="admit-card-field">
                            <label>Start Time</label>
                            <span>{new Date(admitCard.examDate).toLocaleString()}</span>
                        </div>
                        <div className="admit-card-field">
                            <label>End Time</label>
                            <span>{new Date(admitCard.examEndTime).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="admit-card-qr">
                        <p><strong>Verification QR Code</strong></p>
                        <img src={admitCard.qrCode} alt="QR Code" />
                        <p>Scan for verification</p>
                    </div>
                </div>
            </div>

            <div className="card mt-2 no-print">
                <h3 className="mb-1">Instructions</h3>
                <ul style={{ marginLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <li>Bring a printed or digital copy of this admit card</li>
                    <li>Arrive 15 minutes before exam start time</li>
                    <li>Keep your student ID ready for verification</li>
                    <li>The QR code will be scanned for authentication</li>
                </ul>
            </div>
        </div>
    );
}

export default AdmitCard;
