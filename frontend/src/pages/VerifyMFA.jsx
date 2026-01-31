import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function VerifyMFA({ onLogin }) {
    const navigate = useNavigate();
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [timeLeft, setTimeLeft] = useState(300);
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const hasSentOtp = useRef(false);

    useEffect(() => {
        const tempToken = localStorage.getItem('tempToken');
        if (!tempToken) {
            navigate('/login');
            return;
        }

        // Send OTP only once
        if (!hasSentOtp.current) {
            hasSentOtp.current = true;
            sendOtp();
        }
    }, [navigate]);

    useEffect(() => {
        if (timeLeft <= 0 || !otpSent) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [otpSent]);

    const sendOtp = async () => {
        try {
            const tempToken = localStorage.getItem('tempToken');
            await axios.post(`${API_URL}/auth/send-otp`, {}, {
                headers: { Authorization: `Bearer ${tempToken}` }
            });
            setOtpSent(true);
            setMessage({ type: 'info', text: 'OTP sent to your email. Valid for 5 minutes.' });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to send OTP'
            });
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const tempToken = localStorage.getItem('tempToken');
            const response = await axios.post(`${API_URL}/auth/verify-otp`, { otp }, {
                headers: { Authorization: `Bearer ${tempToken}` }
            });

            onLogin(response.data.user, response.data.token);
            localStorage.removeItem('tempToken');
            navigate('/dashboard');
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Invalid OTP'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setTimeLeft(300);
        await sendOtp();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">Two-Factor Authentication</h1>
                    <p className="auth-subtitle">Enter the 6-digit code sent to your email</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">OTP Code</label>
                        <input
                            type="text"
                            className="form-input text-center"
                            style={{ fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength="6"
                            required
                        />
                    </div>

                    <div className="text-center mb-3">
                        <span className={`badge ${timeLeft > 60 ? 'badge-success' : 'badge-danger'}`}>
                            Time remaining: {formatTime(timeLeft)}
                        </span>
                    </div>

                    {message.text && (
                        <div className={`alert alert-${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading || timeLeft === 0 || otp.length !== 6}
                    >
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>

                    <div className="text-center mt-3">
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            className="btn btn-secondary btn-sm"
                            disabled={loading}
                        >
                            Resend OTP
                        </button>
                    </div>
                </form>

                {timeLeft === 0 && (
                    <div className="alert alert-warning mt-3">
                        OTP expired. Please request a new one.
                    </div>
                )}
            </div>
        </div>
    );
}

export default VerifyMFA;
