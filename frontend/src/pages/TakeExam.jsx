import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function TakeExam() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchExam();
    }, [examId]);

    useEffect(() => {
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const fetchExam = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/exams/exam/${examId}/questions`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const decodedData = JSON.parse(atob(response.data.data));

            setExam(decodedData);
            setQuestions(decodedData.questions);

            const endTime = new Date(decodedData.endTime);
            const remaining = Math.max(0, Math.floor((endTime - new Date()) / 1000));
            setTimeLeft(remaining);

            const initialAnswers = {};
            decodedData.questions.forEach((_, idx) => {
                initialAnswers[idx] = '';
            });
            setAnswers(initialAnswers);
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to load exam'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionIndex, answer) => {
        setAnswers({
            ...answers,
            [questionIndex]: answer
        });
    };

    const handleAutoSubmit = () => {
        if (!submitted) {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (submitting || submitted) return;

        setSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/exams/exam/${examId}/submit`, {
                answers
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSubmitted(true);
            setMessage({ type: 'success', text: 'Exam submitted successfully!' });

            setTimeout(() => navigate('/my-results'), 3000);
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Submission failed'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="exam-container text-center">
                <div className="card">
                    <h2>Exam Submitted!</h2>
                    <p className="text-muted">Your answers have been recorded. Redirecting to results...</p>
                </div>
            </div>
        );
    }

    if (message.type === 'error' && !exam) {
        return (
            <div className="exam-container">
                <div className="alert alert-error">{message.text}</div>
                <button onClick={() => navigate('/exams')} className="btn btn-secondary">
                    Back to Exams
                </button>
            </div>
        );
    }

    return (
        <div className="exam-container">
            <div className="exam-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1>{exam?.title}</h1>
                        <p className="text-muted">{questions.length} questions - {exam?.totalMarks} marks</p>
                    </div>
                    <div className="exam-timer">
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type} mb-3`}>
                    {message.text}
                </div>
            )}

            <div className="questions-container">
                {questions.map((question, idx) => (
                    <div key={idx} className="question-card">
                        <div className="question-header">
                            <span className="question-number">Question {idx + 1}</span>
                            <span className="question-marks">{question.marks} marks</span>
                        </div>
                        <p className="question-text">{question.questionText}</p>

                        {question.questionType === 'multiple_choice' && (
                            <div className="options-list">
                                {question.options.map((option, optIdx) => (
                                    <label
                                        key={optIdx}
                                        className={`option-item ${answers[idx] === option ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name={`q${idx}`}
                                            value={option}
                                            checked={answers[idx] === option}
                                            onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                        />
                                        <span>{option}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {question.questionType === 'true_false' && (
                            <div className="options-list">
                                {['true', 'false'].map((option) => (
                                    <label
                                        key={option}
                                        className={`option-item ${answers[idx] === option ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name={`q${idx}`}
                                            value={option}
                                            checked={answers[idx] === option}
                                            onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                        />
                                        <span style={{ textTransform: 'capitalize' }}>{option}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {question.questionType === 'short_answer' && (
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter your answer"
                                value={answers[idx]}
                                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                            />
                        )}

                        {question.questionType === 'essay' && (
                            <textarea
                                className="form-textarea"
                                placeholder="Write your essay here..."
                                value={answers[idx]}
                                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                rows="6"
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="card mt-4">
                <div className="flex justify-between items-center">
                    <p className="text-muted">
                        Answered: {Object.values(answers).filter(a => a).length} / {questions.length}
                    </p>
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary btn-lg"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit Exam'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TakeExam;
