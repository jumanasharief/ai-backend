import Navbar from "../components/navbar";

function Layout({ children }) {
    return(
        <div className="app-container">
            <div className="navbar-container">
                <Navbar />
                {/* Logo positioned on the right - logo contains its own text */}
                <div className="logo-section">
                    <img src="/Logo.png" alt="AI Powered Coach" className="logo-image" />
                </div>
            </div>
            {children}
        </div>
    );
}

export default Layout; 