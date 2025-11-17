import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';

const Toast = ({ toast }) => {
  const { removeToast } = useToast();
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300); // Match animation duration
  };

  const handleConfirm = () => {
    if (toast.onConfirm) {
      toast.onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (toast.onCancel) {
      toast.onCancel();
    }
    handleClose();
  };

  // Get background color based on toast type
  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return '#2A7337';
      case 'error':
        return '#dc3545';
      case 'info':
        return '#0d6efd';
      case 'confirm':
        return '#2A7337';
      default:
        return '#6c757d';
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: getBackgroundColor(),
        color: 'white',
        padding: toast.type === 'confirm' ? '1rem' : '0.875rem 1rem',
        borderRadius: '8px',
        marginBottom: '0.75rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        minWidth: '280px',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        gap: toast.type === 'confirm' ? '0.75rem' : '0',
        position: 'relative',
        animation: isExiting ? 'slideOut 0.3s ease-out' : 'slideIn 0.3s ease-out',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out'
      }}
    >
      {/* Message */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between',
        gap: '0.5rem'
      }}>
        <span style={{ 
          flex: 1, 
          fontSize: '0.95rem',
          lineHeight: '1.4'
        }}>
          {toast.message}
        </span>
        
        {/* Close button (only for non-confirm toasts) */}
        {toast.type !== 'confirm' && (
          <button
            onClick={handleClose}
            aria-label="Close notification"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
          >
            ×
          </button>
        )}
      </div>

      {/* Confirm buttons */}
      {toast.type === 'confirm' && (
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleCancel}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '5px',
              padding: '0.4rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              backgroundColor: 'white',
              color: '#2A7337',
              border: 'none',
              borderRadius: '5px',
              padding: '0.4rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
};

export default Toast;

