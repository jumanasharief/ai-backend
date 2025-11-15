import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

/**
 * SignUp Component
 * Handles new user registration (step 1 of 2)
 * 
 * Features:
 * - Email and password validation
 * - Password confirmation matching
 * - Real-time validation feedback
 * - Saves email to UserContext on success
 * - Navigates to ProfileSetup after signup
 */
const SignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useUser();
  
  // Form state management
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Error state for validation feedback
  const [errors, setErrors] = useState({});
  
  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation helper: checks if email format is valid
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation helper: checks if password meets requirements
  const validatePassword = (password) => {
    return password.length >= 8;
  };

  // Validation helper: checks if passwords match
  const validatePasswordMatch = (password, confirmPassword) => {
    return password === confirmPassword;
  };

  // Real-time validation on input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate all form fields
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Password confirmation validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (!validatePasswordMatch(formData.password, formData.confirmPassword)) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { user: newUser, error } = await signUp(formData.email, formData.password);
      if (error || !newUser) {
        throw error || new Error('Signup failed');
      }

      alert('Account created! Let\'s set up your profile.');
      navigate('/profile-setup');

    } catch (error) {
      console.error('Signup error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid for submit button state
  const isFormValid = formData.email && 
                     formData.password && 
                     formData.confirmPassword &&
                     validateEmail(formData.email) &&
                     validatePassword(formData.password) &&
                     validatePasswordMatch(formData.password, formData.confirmPassword);

  return (
    <div className="goals-container">
      <h2>Create Account</h2>
      <p>Join us to start your fitness journey!</p>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
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
              border: `2px solid ${errors.email ? '#dc3545' : '#e0e0e0'}`,
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your email"
            required
          />
          {errors.email && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.email}
            </div>
          )}
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: '1rem' }}>
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
              border: `2px solid ${errors.password ? '#dc3545' : '#e0e0e0'}`,
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your password"
            required
          />
          {errors.password && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.password}
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `2px solid ${errors.confirmPassword ? '#dc3545' : '#e0e0e0'}`,
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
            placeholder="Confirm your password"
            required
          />
          {errors.confirmPassword && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.confirmPassword}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem 2rem',
            fontSize: '1.1rem',
            fontWeight: '600',
            borderRadius: '8px',
            opacity: (!isFormValid || isSubmitting) ? 0.6 : 1,
            cursor: (!isFormValid || isSubmitting) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      {/* Sign In Link */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', margin: 0 }}>
          Already have an account?{' '}
          <Link 
            to="/" 
            style={{ 
              color: '#2A7337', 
              textDecoration: 'none', 
              fontWeight: '600' 
            }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
