import React, { useState } from 'react';
// import { Star, StarFill } from 'react-bootstrap-icons'; // TEMPORARILY COMMENTED - DEPENDENCY MISSING

// Simple star component replacement
const Star = ({ filled, onClick, onMouseEnter, onMouseLeave }) => (
  <span 
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{ 
      cursor: 'pointer', 
      fontSize: '2rem',
      color: filled ? '#fbbf24' : '#d1d5db',
      marginRight: '0.25rem'
    }}
  >
    {filled ? '★' : '☆'}
  </span>
);

const DeliveryRatingForm = ({ 
  deliveryId, 
  riderId, 
  riderName, 
  onSubmit, 
  onCancel,
  isSubmitting = false 
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleStarClick = (starValue) => {
    setRating(starValue);
  };

  const handleStarHover = (starValue) => {
    setHoverRating(starValue);
  };

  const handleStarLeave = () => {
    setHoverRating(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Please select a rating before submitting');
      return;
    }

    try {
      await onSubmit({
        deliveryId,
        riderId,
        rating,
        feedback: feedback.trim(),
        timestamp: new Date()
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    }
  };

  const getRatingText = (stars) => {
    switch (stars) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select Rating';
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
          <p className="text-gray-600 mb-4">
            Your rating has been submitted successfully.
          </p>
          <button
            onClick={onCancel}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold mb-2">Rate Your Delivery</h3>
          <p className="text-gray-600">
            How was your experience with {riderName || 'your rider'}?
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div className="mb-6">
            <div className="flex justify-center space-x-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  filled={star <= (hoverRating || rating)}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={handleStarLeave}
                />
              ))}
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700">
                {getRatingText(hoverRating || rating)}
              </span>
              {(hoverRating || rating) > 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  ({hoverRating || rating}/5)
                </span>
              )}
            </div>
          </div>

          {/* Feedback Text */}
          <div className="mb-6">
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us about your delivery experience..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {feedback.length}/500
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryRatingForm;