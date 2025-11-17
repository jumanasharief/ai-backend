import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';

/**
 * ProfileSetup Component
 * Collects profile information after signup (shown ONLY after SignUp)
 * 
 * Features:
 * - Name, gender, birthdate, and profile picture collection
 * - Age calculation and validation (minimum 13 years)
 * - Profile picture upload with base64 conversion
 * - File validation (type and size)
 * - Saves complete user data to UserContext and localStorage
 */
const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, updateUser, loading } = useUser();
  const { showSuccess, showError } = useToast();
  
  // Form state management
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    birthdate: '',
    profilePicture: null
  });
  
  // Error state for validation feedback
  const [errors, setErrors] = useState({});
  
  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user has email or uid (should come from SignUp)
  useEffect(() => {
    // Wait for auth state to load
    if (loading) {
      return;
    }
    
    // If no user or no email/uid, redirect to signup
    if (!user || (!user.email && !user.uid)) {
      console.log('No user found, redirecting to signup');
      navigate('/signup');
    }
  }, [user, loading, navigate]);

  // Calculate age from birthdate
  const calculateAge = (birthdate) => {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Validate minimum age (13 years)
  const validateAge = (birthdate) => {
    const age = calculateAge(birthdate);
    return age >= 13;
  };

  // Handle input changes
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

  // Handle profile picture upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    
    // Validate file exists
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showError('Please upload a valid image file (JPG, PNG, or GIF)');
      setErrors(prev => ({
        ...prev,
        profilePicture: 'Please upload a valid image file (JPG, PNG, or GIF)'
      }));
      return;
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      showError('File size must be less than 5MB');
      setErrors(prev => ({
        ...prev,
        profilePicture: 'File size must be less than 5MB'
      }));
      return;
    }
    
    // Convert to base64 for storage
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        profilePicture: reader.result // Store base64 string
      }));
      setErrors(prev => ({
        ...prev,
        profilePicture: '' // Clear any errors
      }));
    };
    reader.onerror = () => {
      setErrors(prev => ({
        ...prev,
        profilePicture: 'Failed to read file. Please try again.'
      }));
    };
    reader.readAsDataURL(file);
  };

  // Validate all form fields
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (/\d/.test(formData.name)) {
      newErrors.name = 'Name cannot contain numbers';
    }

    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    // Birthdate validation
    if (!formData.birthdate) {
      newErrors.birthdate = 'Birthdate is required';
    } else if (!validateAge(formData.birthdate)) {
      newErrors.birthdate = 'You must be at least 13 years old to use this app';
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
      // Calculate age from birthdate
      const age = calculateAge(formData.birthdate);
      
      // Prepare complete user data
      const completeUserData = {
        ...user, // Include email from previous step
        name: formData.name,
        gender: formData.gender,
        birthdate: formData.birthdate,
        age: age,
        profilePicture: formData.profilePicture,
        isAuthenticated: true
      };

      // Update user context with complete data
      updateUser(completeUserData);
      
      // Show success message and navigate
      showSuccess('Profile complete! Let\'s set your fitness goals.');
      navigate('/goals');
      
    } catch (error) {
      console.error('Profile setup error:', error);
      showError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get today's date for max date validation
  const today = new Date().toISOString().split('T')[0];

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="goals-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, don't render form (redirect will happen)
  if (!user || (!user.email && !user.uid)) {
    return null;
  }

  return (
    <div className="goals-container">
      <h2>Complete Your Profile</h2>
      <p>Tell us a bit about yourself to personalize your experience!</p>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '0 auto' }}>
        {/* Name Input */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `2px solid ${errors.name ? '#dc3545' : '#e0e0e0'}`,
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your full name"
            required
          />
          {errors.name && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.name}
            </div>
          )}
        </div>

        {/* Gender Selection */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="gender" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Gender *
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `2px solid ${errors.gender ? '#dc3545' : '#e0e0e0'}`,
              borderRadius: '8px',
              boxSizing: 'border-box',
              backgroundColor: 'white'
            }}
            required
          >
            <option value="">Select your gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.gender && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.gender}
            </div>
          )}
        </div>

        {/* Birthdate Input */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="birthdate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Birthdate *
          </label>
          <input
            type="date"
            id="birthdate"
            name="birthdate"
            value={formData.birthdate}
            onChange={handleInputChange}
            max={today}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `2px solid ${errors.birthdate ? '#dc3545' : '#e0e0e0'}`,
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
            required
          />
          {errors.birthdate && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.birthdate}
            </div>
          )}
        </div>

        {/* Profile Picture Upload */}
        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="profilePicture" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Profile Picture (Optional)
          </label>
          <input
            type="file"
            id="profilePicture"
            name="profilePicture"
            accept="image/jpeg,image/jpg,image/png,image/gif"
            onChange={handleFileUpload}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `2px solid ${errors.profilePicture ? '#dc3545' : '#e0e0e0'}`,
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
          />
          {errors.profilePicture && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.profilePicture}
            </div>
          )}
          
          {/* Profile Picture Preview */}
          {formData.profilePicture && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Preview:</p>
              <img
                src={formData.profilePicture}
                alt="Profile preview"
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #2A7337'
                }}
              />
            </div>
          )}
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
          {isSubmitting ? 'Completing Profile...' : 'Complete Profile'}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup;
