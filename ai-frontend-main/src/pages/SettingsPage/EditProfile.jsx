import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';

const EditProfile = () => {
  // Get user data and update function from context
  const { user, updateUser, logout } = useUser();
  const navigate = useNavigate();

  // Local state for form inputs
  // Initialize with current user values
  const [formData, setFormData] = useState({
    name: user?.name || '',
    gender: user?.gender || '',
    birthdate: user?.birthdate || '',
  });

  // State for image upload preview
  const [imagePreview, setImagePreview] = useState(user?.profilePicture || '');

  // Handle input changes
  // Updates local state as user types
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle profile picture upload
  // Converts uploaded file to base64 for storage
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 2MB to avoid localStorage issues)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }

      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSave = () => {
    // Validate inputs
    if (!formData.name.trim()) {
      alert('Name cannot be empty');
      return;
    }

    // Calculate age from birthdate if provided
    let age = null;
    if (formData.birthdate) {
      const today = new Date();
      const birthDate = new Date(formData.birthdate);
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Update user data in context with all fields
    updateUser({
      ...formData,
      age: age,
      profilePicture: imagePreview
    });

    // Navigate back to profile view
    navigate('/profile');
  };

  // Handle cancel - discard changes
  const handleCancel = () => {
    navigate('/profile');
  };

  // Logout handler
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/');
    }
  };

  return (
    <div className="goals-container">
      <h2>Settings</h2>

      {/* Profile Picture Upload */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {imagePreview ? (
          <img 
            src={imagePreview} 
            alt="Profile Preview" 
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid #2A7337'
            }}
          />
        ) : (
          <div style={{
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            backgroundColor: '#2A7337',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            border: '4px solid #2A7337'
          }}>
            <span style={{
              color: 'white',
              fontSize: '60px',
              fontWeight: 'bold'
            }}>{(formData.name || 'U').charAt(0)}</span>
          </div>
        )}
        
        {/* File input for image upload */}
        <input 
          type="file" 
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          id="profile-pic-input"
        />
        <label 
          htmlFor="profile-pic-input" 
          style={{
            display: 'inline-block',
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Change Picture
        </label>
      </div>

      {/* Editable Form Fields */}
      <div style={{ marginBottom: '2rem' }}>
        {/* Name Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your name"
            style={{ width: '100%' }}
          />
        </div>

        {/* Gender Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Gender</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            style={{ width: '100%' }}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        {/* Birthdate Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Birthdate</label>
          <input
            type="date"
            name="birthdate"
            value={formData.birthdate}
            onChange={handleInputChange}
            max={new Date().toISOString().split('T')[0]}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Save/Cancel Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '40px' }}>
        <button onClick={handleSave} style={{ flex: 1 }}>
          Save Changes
        </button>
        <button 
          onClick={handleCancel}
          style={{ 
            flex: 1,
            backgroundColor: '#6c757d',
            color: 'white'
          }}
        >
          Cancel
        </button>
      </div>

      {/* Logout Section */}
      <div style={{ 
        borderTop: '1px solid #ddd', 
        paddingTop: '30px',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#2A7337', marginBottom: '1rem' }}>Account Actions</h3>
        <button 
          onClick={handleLogout}
          style={{ 
            width: '100%',
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '5px'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default EditProfile;
