import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ toast, onClose }) => {
  const getToastStyles = (type) => {
    const styles = {
      success: {
        bg: 'from-green-50 to-emerald-50',
        border: 'border-green-200',
        icon: CheckCircleIcon,
        iconColor: 'text-green-500'
      },
      error: {
        bg: 'from-red-50 to-rose-50',
        border: 'border-red-200',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-red-500'
      },
      info: {
        bg: 'from-blue-50 to-cyan-50',
        border: 'border-blue-200',
        icon: InformationCircleIcon,
        iconColor: 'text-blue-500'
      }
    };
    return styles[type] || styles.info;
  };

  const toastStyle = getToastStyles(toast.type);
  const IconComponent = toastStyle.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      className={`bg-gradient-to-r ${toastStyle.bg} ${toastStyle.border} border backdrop-blur-sm rounded-2xl p-4 shadow-xl max-w-sm w-full`}
      style={{
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      <div className="flex items-start gap-3">
        <IconComponent className={`w-6 h-6 ${toastStyle.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">{toast.title}</h4>
          {toast.message && (
            <p className="text-gray-600 text-sm mt-1">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};

const ToastContainer = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook for managing toasts
const useToasts = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (type, title, message, duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, type, title, message };
    
    setToasts(prev => [...prev, newToast]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (title, message, duration) => 
    showToast('success', title, message, duration);
  
  const showError = (title, message, duration) => 
    showToast('error', title, message, duration);
  
  const showInfo = (title, message, duration) => 
    showToast('info', title, message, duration);

  const clearAll = () => setToasts([]);

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    removeToast,
    clearAll
  };
};

export { ToastContainer, useToasts };