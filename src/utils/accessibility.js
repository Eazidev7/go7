/**
 * Keyboard Navigation Detection
 * Adds class to body when user navigates via keyboard
 */

let isUsingKeyboard = false;

// Detect keyboard navigation
document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    isUsingKeyboard = true;
    document.body.classList.add('keyboard-navigation');
  }
});

// Detect mouse navigation
document.addEventListener('mousedown', () => {
  isUsingKeyboard = false;
  document.body.classList.remove('keyboard-navigation');
});

// Add focus management utilities
window.Go7Accessibility = {
  // Focus management
  trapFocus: (element) => {
    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    });
  },
  
  // Skip link functionality
  addSkipLink: (targetId, linkText = 'Skip to main content') => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = linkText;
    skipLink.className = 'skip-link';
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView();
      }
    });
    document.body.insertBefore(skipLink, document.body.firstChild);
  },
  
  // Announce to screen readers
  announce: (message, priority = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }
};

// Initialize accessibility features
document.addEventListener('DOMContentLoaded', () => {
  // Add skip link if main content exists
  const mainContent = document.getElementById('main-content') || document.querySelector('main');
  if (mainContent) {
    if (!mainContent.id) mainContent.id = 'main-content';
    window.Go7Accessibility.addSkipLink(mainContent.id);
  }
});

export default window.Go7Accessibility;