import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function VerifyEmail() {
    const { token } = useParams();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const response = await axios.get(`${API_URL}/auth/verify-email/${token}`);
                setStatus('success');
                setMessage(response.data.message);
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed');
            }
        };

        verifyEmail();
    }, [token]);

    return (
        <div className="auth-container">
            <div className="auth-card text-center">
                {status === 'verifying' && (
                    <>
                        <div className="loading-spinner mb-3"></div>
                        <h2>Verifying your email...</h2>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <h2 className="text-success">Email Verified!</h2>
                        <p className="text-muted mt-2">{message}</p>
                        <Link to="/login" className="btn btn-primary mt-3">
                            Proceed to Login
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <h2 className="text-danger">Verification Failed</h2>
                        <p className="text-muted mt-2">{message}</p>
                        <Link to="/register" className="btn btn-secondary mt-3">
                            Register Again
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

export default VerifyEmail;
