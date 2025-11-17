import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';

/**
 * SignIn Component
 * Handles user login authentication
 * 
 * Features:
 * - Email and password validation
 * - Firebase authentication
 * - Loads user data into UserContext on success
 * - Navigates to home dashboard after login
 */
const SignIn = () => {
  const navigate = useNavigate();
  const { signIn } = useUser();
  const { showSuccess } = useToast();
  
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
      console.log('🔐 Attempting login with Firebase...');
      
      const { user: firebaseUser, error: signInError } = await signIn(formData.email, formData.password);
      
      if (signInError) {
        console.error('❌ Login error:', signInError);
        
        // Handle specific Firebase errors
        switch (signInError.code) {
          case 'auth/user-not-found':
            setError('Email not registered. Please sign up first.');
            break;
          case 'auth/wrong-password':
            setError('Incorrect password. Please try again.');
            break;
          case 'auth/invalid-email':
            setError('Invalid email address.');
            break;
          case 'auth/invalid-credential':
            setError('Invalid email or password. Please check your credentials.');
            break;
          case 'auth/too-many-requests':
            setError('Too many failed attempts. Please try again later.');
            break;
          case 'auth/network-request-failed':
            setError('Network error. Please check your internet connection.');
            break;
          case 'auth/user-disabled':
            setError('This account has been disabled.');
            break;
          default:
            setError('Login error: ' + (signInError.message || 'Please try again.'));
        }
        setIsSubmitting(false);
        return;
      }

      if (firebaseUser) {
        console.log('✅ Login successful:', firebaseUser.uid);
        
        // Show success message
        showSuccess('Welcome back!');
        
        // Wait a moment for auth state to update, then navigate
        setTimeout(() => {
          navigate('/home');
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
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
