import { Link, useNavigate } from 'react-router-dom';

function Navbar({ user, onLogout }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/dashboard" className="navbar-brand">
                    Secure Exam Portal
                </Link>

                <ul className="navbar-nav">
                    <li>
                        <Link to="/dashboard" className="nav-link">Dashboard</Link>
                    </li>
                    {user?.role === 'admin' && (
                        <li>
                            <Link to="/admin-dashboard" className="nav-link">Admin Panel</Link>
                        </li>
                    )}
                    <li>
                        <Link to="/exams" className="nav-link">Exams</Link>
                    </li>
                    {(user?.role === 'instructor' || user?.role === 'admin') && (
                        <li>
                            <Link to="/create-exam" className="nav-link">Create Exam</Link>
                        </li>
                    )}
                    {user?.role === 'student' && (
                        <li>
                            <Link to="/my-results" className="nav-link">Results</Link>
                        </li>
                    )}
                </ul>

                <div className="navbar-actions">
                    <span>
                        {user?.username} ({user?.role})
                    </span>
                    <button onClick={handleLogout} className="btn">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
