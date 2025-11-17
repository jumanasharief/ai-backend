import React from 'react';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const { logout } = useUser();
  const { showConfirm, showSuccess } = useToast();
  const navigate = useNavigate();

  // Handle logout
  // Clears user data and navigates to sign in page
  const handleLogout = () => {
    // Show confirmation dialog
    showConfirm(
      'Are you sure you want to logout?',
      () => {
        // Clear user data and localStorage
        logout();
        
        // Show success message
        showSuccess('You have been logged out successfully');
        
        // Navigate to sign in page
        navigate('/');
      },
      () => {
        // User cancelled, do nothing
      }
    );
  };

  return (
    <div className="goals-container">
      <h2 style={{ color: '#dc3545' }}>Logout</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Are you sure you want to logout from your account?
      </p>
      
      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        style={{ 
          backgroundColor: '#dc3545',
          color: 'white',
          marginRight: '1rem',
          width: '200px'
        }}
      >
        Logout
      </button>

      {/* Cancel/Back Button */}
      <button 
        onClick={() => navigate('/settings/edit-profile')}
        style={{ 
          backgroundColor: '#6c757d',
          color: 'white',
          width: '200px'
        }}
      >
        Cancel
      </button>
    </div>
  );
};

export default Logout;
