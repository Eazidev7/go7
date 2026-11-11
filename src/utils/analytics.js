// Simple analytics utility
export const trackEvent = (eventName, properties = {}) => {
  // Console log for development
  console.log('Analytics Event:', eventName, properties);
  
  // In production, this would integrate with Google Analytics, Mixpanel, etc.
  // For now, just a simple console log
};

export const trackPageView = (pageName) => {
  trackEvent('page_view', { page: pageName });
};

export default {
  trackEvent,
  trackPageView
};