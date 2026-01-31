import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function MyResults() {
    const [results, setResults] = useState([]);
    const [pendingResults, setPendingResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/results/my-results`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResults(response.data.results || []);
            setPendingResults(response.data.pendingResults || []);
        } catch (error) {
            console.error('Fetch results error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (grade) => {
        switch (grade) {
            case 'A': return 'badge-success';
            case 'B': return 'badge-primary';
            case 'C': return 'badge-warning';
            case 'D': return 'badge-warning';
            default: return 'badge-danger';
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    const allExams = [...results, ...pendingResults];
    const avgScore = results.length > 0
        ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(1)
        : 0;

    return (
        <div>
            <div className="dashboard-header">
                <h1>My Results</h1>
            </div>

            <div className="stats-row">
                <div className="stat-card primary">
                    <div>
                        <h3>{allExams.length}</h3>
                        <p>Total Exams</p>
                    </div>
                </div>
                <div className="stat-card success">
                    <div>
                        <h3>{results.length}</h3>
                        <p>Graded</p>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div>
                        <h3>{pendingResults.length}</h3>
                        <p>Pending Review</p>
                    </div>
                </div>
                <div className="stat-card accent">
                    <div>
                        <h3>{avgScore}%</h3>
                        <p>Average Score</p>
                    </div>
                </div>
            </div>

            {allExams.length === 0 ? (
                <div className="card text-center">
                    <p className="text-muted">No exams taken yet.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Exam</th>
                                <th>Score</th>
                                <th>Percentage</th>
                                <th>Grade</th>
                                <th>Result</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((result) => {
                                const passingPercent = ((result.examId?.passingMarks || 40) / (result.examId?.totalMarks || 100)) * 100;
                                const isPassed = result.percentage >= passingPercent;

                                return (
                                    <tr key={result._id}>
                                        <td><strong>{result.examId?.title || 'Unknown'}</strong></td>
                                        <td>{result.marksObtained} / {result.totalMarks}</td>
                                        <td>{result.percentage.toFixed(1)}%</td>
                                        <td>
                                            <span className={`badge ${getGradeColor(result.grade)}`}>
                                                {result.grade}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${isPassed ? 'badge-success' : 'badge-danger'}`}>
                                                {isPassed ? 'PASSED' : 'FAILED'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge badge-success">Graded</span>
                                        </td>
                                        <td>{new Date(result.gradedAt).toLocaleDateString()}</td>
                                    </tr>
                                );
                            })}
                            {pendingResults.map((result) => (
                                <tr key={result._id}>
                                    <td><strong>{result.examId?.title || 'Unknown'}</strong></td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>
                                        <span className="badge badge-warning">Pending Review</span>
                                    </td>
                                    <td>{new Date(result.gradedAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default MyResults;
