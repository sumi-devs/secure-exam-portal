import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyMFA from './pages/VerifyMFA';
import VerifyEmail from './pages/VerifyEmail';
import VerifyAdmit from './pages/VerifyAdmit';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateExam from './pages/CreateExam';
import TakeExam from './pages/TakeExam';
import MyResults from './pages/MyResults';
import AdmitCard from './pages/AdmitCard';
import ExamList from './pages/ExamList';
import ExamSubmissions from './pages/ExamSubmissions';
import './index.css';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tempToken');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && <Navbar user={user} onLogout={handleLogout} />}
        <main className={isAuthenticated ? "main-content" : ""}>
          <Routes>
            {/* Public Routes */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-mfa" element={<VerifyMFA onLogin={handleLogin} />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/verify-admit/:examId/:studentId" element={<VerifyAdmit />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams"
              element={
                <ProtectedRoute>
                  <ExamList user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-exam"
              element={
                <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                  <CreateExam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/take-exam/:examId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <TakeExam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:examId/submissions"
              element={
                <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                  <ExamSubmissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-results"
              element={
                <ProtectedRoute>
                  <MyResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admit-card/:examId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <AdmitCard />
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
