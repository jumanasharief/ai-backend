import React from 'react';
import { useToast } from '../context/ToastContext';
import Toast from './Toast';

const ToastContainer = () => {
  const { toasts } = useToast();

  return (
    <>
      {/* Add keyframe animations */}
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slideOut {
            from {
              opacity: 1;
              transform: translateX(0);
            }
            to {
              opacity: 0;
              transform: translateX(-100%);
            }
          }
        `}
      </style>

      {/* Toast container positioned at bottom-left */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column-reverse', // Stack from bottom to top
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <Toast toast={toast} />
          </div>
        ))}
      </div>
    </>
  );
};

export default ToastContainer;

