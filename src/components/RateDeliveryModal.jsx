import React, { useState } from 'react';
import { Star, MessageCircle, Gift, ArrowRight, Sparkles } from 'lucide-react';
import { addOrderRating } from '../services/pointsService';
import { useAuth } from '../contexts/AuthContext';

const RateDeliveryModal = ({ order, isOpen, onClose, onRatingSubmitted }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);

  const ratingLabels = {
    1: '😞 Poor',
    2: '😐 Fair', 
    3: '🙂 Good',
    4: '😊 Very Good',
    5: '🤩 Excellent'
  };

  const handleStarClick = (starRating) => {
    setRating(starRating);
  };

  const handleStarHover = (starRating) => {
    setHoverRating(starRating);
  };

  const handleStarLeave = () => {
    setHoverRating(0);
  };

  const calculateExpectedPoints = () => {
    let points = 50; // Base order completion points
    if (rating > 0) points += 25; // Rating bonus
    if (comment.trim().length > 0) points += 15; // Comment bonus
    if (rating === 5) points += 50; // Excellent rating bonus
    return points;
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!user?.uid) {
      alert('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await addOrderRating(order.firebaseId || order.id, {
        stars: rating,
        comment: comment.trim(),
        userId: user.uid
      });

      setPointsAwarded(result.pointsAwarded);
      setShowSuccess(true);
      
      // Auto close after 3 seconds
      setTimeout(() => {
        onRatingSubmitted?.(result);
        onClose();
        resetForm();
      }, 3000);

    } catch (error) {
      console.error('Failed to submit rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setComment('');
    setShowSuccess(false);
    setPointsAwarded(0);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      resetForm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          // Success Screen
          <div className="p-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">Your rating has been submitted successfully.</p>
            
            {/* Points Earned */}
            <div className="bg-[#E50914] bg-opacity-10 border border-[#E50914] border-opacity-20 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-[#E50914]" />
                <span className="font-semibold text-[#E50914]">Points Earned!</span>
              </div>
              <div className="text-2xl font-bold text-[#E50914] mb-1">+{pointsAwarded}</div>
              <div className="text-sm text-gray-600">Go7 Points added to your account</div>
            </div>

            <div className="text-sm text-gray-500">
              Closing automatically in a few seconds...
            </div>
          </div>
        ) : (
          // Rating Form
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Rate Your Delivery</h2>
              <p className="text-gray-600 text-sm">
                Order #{order?.orderId} • {order?.rider?.name || 'Your rider'}
              </p>
            </div>

            {/* Rating Section */}
            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  How was your delivery experience?
                </h3>
                
                {/* Star Rating */}
                <div className="flex justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => handleStarHover(star)}
                      onMouseLeave={handleStarLeave}
                      className="p-1 transition-transform hover:scale-110"
                      disabled={isSubmitting}
                    >
                      <Star
                        size={32}
                        className={`${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>

                {/* Rating Label */}
                {(hoverRating || rating) > 0 && (
                  <div className="text-lg font-medium text-gray-700 mb-4">
                    {ratingLabels[hoverRating || rating]}
                  </div>
                )}
              </div>

              {/* Comment Section */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                  <MessageCircle className="w-4 h-4" />
                  Share your feedback (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about your experience..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#E50914] focus:border-transparent"
                  rows={3}
                  maxLength={200}
                  disabled={isSubmitting}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {comment.length}/200
                </div>
              </div>

              {/* Points Preview */}
              {rating > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">You'll earn points!</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    +{calculateExpectedPoints()}
                  </div>
                  <div className="text-sm text-green-700">
                    <div>• Order completion: +50 points</div>
                    {rating > 0 && <div>• Rating bonus: +25 points</div>}
                    {comment.trim().length > 0 && <div>• Comment bonus: +15 points</div>}
                    {rating === 5 && <div>• Excellent rating: +50 points</div>}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  className="flex-1 py-3 px-4 bg-[#E50914] text-white rounded-lg hover:bg-[#CC0812] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Submit Rating
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RateDeliveryModal;