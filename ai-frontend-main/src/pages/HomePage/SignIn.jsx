import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

/**
 * SignIn Component
 * Handles user login authentication
 * 
 * Features:
 * - Email and password validation
 * - Checks localStorage for existing user data
 * - Loads user data into UserContext on success
 * - Navigates to goals dashboard after login
 */
const SignIn = () => {
  const navigate = useNavigate();
  const { updateUser } = useUser();
  
  // Form state management
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // Error state for authentication feedback
  const [error, setError] = useState('');
  
  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // TODO: Replace with API call when backend is ready
      // Endpoint: POST /api/auth/signin
      // Payload: { email, password }
      // Response: { user, token }
      
      // For now: check localStorage for user data
      const savedUserData = localStorage.getItem('userData');
      
      if (!savedUserData) {
        setError('No account found. Please sign up.');
        setIsSubmitting(false);
        return;
      }

      const userData = JSON.parse(savedUserData);
      
      // Check if email matches (password validation would be done on backend)
      if (userData.email !== formData.email) {
        setError('Incorrect email or password');
        setIsSubmitting(false);
        return;
      }

      // Load user data into context and mark as authenticated
      updateUser({
        ...userData,
        isAuthenticated: true
      });
      
      // Show welcome message and navigate
      const userName = userData.name || 'User';
      alert(`Welcome back, ${userName}!`);
      
      // Navigate to home page (which will show dashboard for authenticated users)
      navigate('/');
      
    } catch (error) {
      console.error('Sign in error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="goals-container">
      <h2>Welcome Back</h2>
      <p>Sign in to continue your fitness journey!</p>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {/* Email Input */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your email"
            required
          />
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your password"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem 2rem',
            fontSize: '1.1rem',
            fontWeight: '600',
            borderRadius: '8px',
            opacity: isSubmitting ? 0.6 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      {/* Sign Up Link */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', margin: 0 }}>
          Don't have an account?{' '}
          <Link 
            to="/signup" 
            style={{ 
              color: '#2A7337', 
              textDecoration: 'none', 
              fontWeight: '600' 
            }}
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
