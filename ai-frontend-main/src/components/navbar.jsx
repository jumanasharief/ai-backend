import { Link } from "react-router-dom";

// Navigation bar component - includes all main navigation links as shown in Figma
function Navbar() {
    return (
        <nav className="navbar-links">
            <Link to="/home">Home</Link>
            <Link to="/goals" className="navbar-current">Goals</Link>
            <Link to="/workouts">Workout Library</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/settings/edit-profile">Settings</Link>
            <Link to="/more">More..</Link>
        </nav>
    );
}

export default Navbar;