// Simple headless toast notification system

let toastContainer = null;
let toastId = 0;

// Create toast container if it doesn't exist
const getToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

// Remove toast after delay
const removeToast = (element, delay = 0) => {
  setTimeout(() => {
    if (element && element.parentNode) {
      element.style.opacity = '0';
      element.style.transform = 'translateX(100%)';
      setTimeout(() => {
        element.remove();
      }, 300);
    }
  }, delay);
};

// Create toast element
const createToastElement = (message, type = 'success') => {
  const toast = document.createElement('div');
  const id = `toast-${++toastId}`;
  toast.id = id;
  
  const baseClasses = 'pointer-events-auto transform transition-all duration-300 ease-in-out translate-x-0 opacity-100 max-w-sm w-full bg-white shadow-lg rounded-lg border';
  const typeClasses = {
    success: 'border-green-200 text-green-800',
    error: 'border-red-200 text-red-800',
    warning: 'border-yellow-200 text-yellow-800',
    info: 'border-blue-200 text-blue-800'
  };
  
  toast.className = `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
  
  const icon = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <div class="p-4">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <span class="text-lg" role="img" aria-label="${type}">${icon[type] || icon.info}</span>
        </div>
        <div class="ml-3 w-0 flex-1">
          <p class="text-sm font-medium">${message}</p>
        </div>
        <div class="ml-4 flex-shrink-0 flex">
          <button 
            class="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-md"
            onclick="this.parentElement.parentElement.parentElement.parentElement.remove()"
            aria-label="Close notification"
          >
            <span class="sr-only">Close</span>
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Initial state for animation
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';
  
  return toast;
};

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Toast type: 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - How long to show the toast (ms). 0 = permanent
 */
export const toast = (message, type = 'success', duration = 4000) => {
  const container = getToastContainer();
  const toastElement = createToastElement(message, type);
  
  container.appendChild(toastElement);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toastElement.style.opacity = '1';
    toastElement.style.transform = 'translateX(0)';
  });
  
  // Auto remove after duration
  if (duration > 0) {
    removeToast(toastElement, duration);
  }
  
  return toastElement;
};

// Convenience methods
export const toastSuccess = (message, duration) => toast(message, 'success', duration);
export const toastError = (message, duration) => toast(message, 'error', duration);
export const toastWarning = (message, duration) => toast(message, 'warning', duration);
export const toastInfo = (message, duration) => toast(message, 'info', duration);

// Clear all toasts
export const clearToasts = () => {
  if (toastContainer) {
    toastContainer.innerHTML = '';
  }
};
