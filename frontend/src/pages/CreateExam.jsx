import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function CreateExam() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        totalMarks: 100,
        passingMarks: 40,
        questions: []
    });
    const [currentQuestion, setCurrentQuestion] = useState({
        questionText: '',
        questionType: 'multiple_choice',
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 2
    });
    const [students, setStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/exams/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudents(response.data.students || []);
        } catch (error) {
            console.error('Fetch students error:', error);
        }
    };

    const handleAddQuestion = () => {
        if (!currentQuestion.questionText) {
            setMessage({ type: 'error', text: 'Question text is required' });
            return;
        }

        if (currentQuestion.questionType === 'multiple_choice' && !currentQuestion.correctAnswer) {
            setMessage({ type: 'error', text: 'Please select the correct answer' });
            return;
        }

        setFormData({
            ...formData,
            questions: [...formData.questions, { ...currentQuestion }]
        });

        setCurrentQuestion({
            questionText: '',
            questionType: 'multiple_choice',
            options: ['', '', '', ''],
            correctAnswer: '',
            marks: 2
        });
        setMessage({ type: '', text: '' });
    };

    const handleRemoveQuestion = (index) => {
        const updatedQuestions = formData.questions.filter((_, i) => i !== index);
        setFormData({ ...formData, questions: updatedQuestions });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (formData.questions.length === 0) {
            setMessage({ type: 'error', text: 'Please add at least one question' });
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');

            const examResponse = await axios.post(`${API_URL}/exams/exam`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const examId = examResponse.data.examId;

            if (selectedStudents.length > 0) {
                await axios.post(`${API_URL}/exams/exam/${examId}/enroll-students`, {
                    studentIds: selectedStudents
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setMessage({ type: 'success', text: 'Exam created successfully!' });
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to create exam'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleStudentSelection = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    return (
        <div className="exam-container">
            <h1 className="mb-4">Create New Exam</h1>

            <div className="flex gap-2 mb-4">
                <button
                    className={`btn ${step === 1 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStep(1)}
                >
                    1. Exam Details
                </button>
                <button
                    className={`btn ${step === 2 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStep(2)}
                >
                    2. Questions ({formData.questions.length})
                </button>
                <button
                    className={`btn ${step === 3 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStep(3)}
                >
                    3. Enroll Students
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {step === 1 && (
                    <div className="card">
                        <h3 className="mb-3">Exam Details</h3>

                        <div className="form-group">
                            <label className="form-label">Exam Title</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-textarea"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-3">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Start Time</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">End Time</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Total Marks</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.totalMarks}
                                    onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Passing Marks</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.passingMarks}
                                    onChange={(e) => setFormData({ ...formData, passingMarks: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
                            Next: Add Questions
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="card">
                        <h3 className="mb-3">Add Questions</h3>

                        <div className="form-group">
                            <label className="form-label">Question Type</label>
                            <select
                                className="form-select"
                                value={currentQuestion.questionType}
                                onChange={(e) => setCurrentQuestion({ ...currentQuestion, questionType: e.target.value })}
                            >
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="true_false">True/False</option>
                                <option value="short_answer">Short Answer</option>
                                <option value="essay">Essay</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Question Text</label>
                            <textarea
                                className="form-textarea"
                                value={currentQuestion.questionText}
                                onChange={(e) => setCurrentQuestion({ ...currentQuestion, questionText: e.target.value })}
                                placeholder="Enter your question here..."
                            />
                        </div>

                        {currentQuestion.questionType === 'multiple_choice' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Options</label>
                                    {currentQuestion.options.map((opt, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            className="form-input mb-2"
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={(e) => {
                                                const newOptions = [...currentQuestion.options];
                                                newOptions[idx] = e.target.value;
                                                setCurrentQuestion({ ...currentQuestion, options: newOptions });
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Correct Answer</label>
                                    <select
                                        className="form-select"
                                        value={currentQuestion.correctAnswer}
                                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                                    >
                                        <option value="">Select correct answer</option>
                                        {currentQuestion.options.filter(o => o).map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {currentQuestion.questionType === 'true_false' && (
                            <div className="form-group">
                                <label className="form-label">Correct Answer</label>
                                <select
                                    className="form-select"
                                    value={currentQuestion.correctAnswer}
                                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                                >
                                    <option value="">Select correct answer</option>
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Marks</label>
                            <input
                                type="number"
                                className="form-input"
                                value={currentQuestion.marks}
                                onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) })}
                            />
                        </div>

                        <button type="button" className="btn btn-success mb-3" onClick={handleAddQuestion}>
                            Add Question
                        </button>

                        {formData.questions.length > 0 && (
                            <div className="mt-4">
                                <h4>Added Questions ({formData.questions.length})</h4>
                                {formData.questions.map((q, idx) => (
                                    <div key={idx} className="question-card">
                                        <div className="question-header">
                                            <span className="question-number">Q{idx + 1}</span>
                                            <span className="question-marks">{q.marks} marks</span>
                                        </div>
                                        <p>{q.questionText}</p>
                                        <span className="badge badge-primary">{q.questionType}</span>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            style={{ marginLeft: '1rem' }}
                                            onClick={() => handleRemoveQuestion(idx)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 mt-3">
                            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                                Back
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                                Next: Enroll Students
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="card">
                        <h3 className="mb-3">Enroll Students</h3>
                        <p className="text-muted mb-3">Select students who can take this exam</p>

                        {students.length === 0 ? (
                            <p className="text-muted">No students registered yet.</p>
                        ) : (
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {students.map((student) => (
                                    <label key={student._id} className="option-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(student._id)}
                                            onChange={() => handleStudentSelection(student._id)}
                                        />
                                        <span>{student.username} ({student.email})</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        <p className="mt-3 text-muted">
                            {selectedStudents.length} students selected
                        </p>

                        {message.text && (
                            <div className={`alert alert-${message.type} mt-3`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex gap-2 mt-3">
                            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                                Back
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Creating Exam...' : 'Create Exam'}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}

export default CreateExam;
