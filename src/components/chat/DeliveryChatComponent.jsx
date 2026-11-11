/**
 * GO7 Delivery Chat Component
 * Real-time messaging interface for delivery communications
 */

import React, { useState, useEffect, useRef } from 'react';
import { deliveryChatService } from '../../services/deliveryChatService';
import { useAuth } from '../../contexts/AuthContext';
import { getAreaCoordinates, hasValidCoordinates } from '../../utils/areaCoords';
import { calculateHaversineDistance, estimateTravelTime } from '../../utils/distanceCalculator';
import { bookDelivery } from '../../services/deliveryService';
import { BASE_FARE, PER_KM_RATE } from '../../utils/pricing';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const DeliveryChatComponent = ({ 
  deliveryId, 
  recipientId, 
  className = '',
  onMessageSent = () => {},
  onError = () => {} 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState('customer');
  const messagesEndRef = useRef(null);
  const { user, isAuthenticated } = useAuth();
  
  // Booking state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [pickupArea, setPickupArea] = useState('');
  const [dropoffArea, setDropoffArea] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [fee, setFee] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');

  // State for rider assignment tracking
  const [riderAssigned, setRiderAssigned] = useState(false);
  const [riderId, setRiderId] = useState(null);
  const [riderName, setRiderName] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState('pending'); // 'pending', 'assigned', 'failed'

  // Initialize chat service and load messages
  useEffect(() => {
    const initializeChat = async () => {
      try {
        if (!isAuthenticated || !deliveryId) {
          setLoading(false);
          return;
        }

        await deliveryChatService.initialize();
        
        // Get current user role
        const role = await deliveryChatService.getUserRole(user?.id);
        setUserRole(role);
        
        // Subscribe to messages
        const unsubscribe = deliveryChatService.subscribeToMessages(
          deliveryId,
          (newMessages) => {
            setMessages(newMessages);
            setLoading(false);
            
            // Update unread count
            const unread = newMessages.filter(msg => 
              msg.receiverId === user?.id && !msg.isRead
            ).length;
            setUnreadCount(unread);
          }
        );

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing chat:', error);
        onError(error);
        setLoading(false);
      }
    };

    initializeChat();
  }, [deliveryId, isAuthenticated, user?.id, onError]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending || !recipientId) {
      return;
    }

    setSending(true);
    try {
      await deliveryChatService.sendMessage(deliveryId, newMessage, recipientId);
      setNewMessage('');
      onMessageSent();
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      onError(error);
    } finally {
      setSending(false);
    }
  };
  
  const handleBookDelivery = async () => {
    try {
      setIsBooking(true);
      setBookingError('');
      
      // Step 1: Validate fields
      if (!validateFields()) {
        setIsBooking(false);
        return;
      }
      
      // Step 2: Fetch coordinates
      const hasCoordinates = fetchCoordinates();
      if (!hasCoordinates) {
        setIsBooking(false);
        return;
      }
      
      // Step 3: Calculate distance
      const hasDistance = calculateDistance();
      if (!hasDistance) {
        setBookingError('Failed to calculate distance between locations');
        setIsBooking(false);
        return;
      }
      
      // Step 4: Calculate fee
      const hasFee = calculateFee();
      if (!hasFee) {
        setBookingError('Failed to calculate delivery fee');
        setIsBooking(false);
        return;
      }
      
      // Step 5: Prepare booking data
      const bookingData = {
        pickup: {
          area: pickupArea,
          coordinates: pickupCoords
        },
        dropoff: {
          area: dropoffArea,
          coordinates: dropoffCoords
        },
        customer: {
          id: user?.id || 'anonymous',
          name: user?.displayName || 'Customer',
          phone: user?.phoneNumber || ''
        },
        distanceKm: distance,
        estimatedTimeMinutes: estimatedTime,
        fare: fee,
        status: 'pending',
        packageDetails: {
          size: 'small',
          description: 'Package from GO7 Chat'
        },
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        createdBy: user?.id || 'anonymous',
        createdFrom: 'chat'
      };
      
      // Step 6: Save booking to Firebase
      const newBookingId = await bookDelivery(bookingData);
      
      if (!newBookingId) {
        throw new Error('Failed to create booking. Please try again.');
      }
      
      // Step 7: Show confirmation
      setBookingId(newBookingId);
      setBookingConfirmed(true);
      
      // Subscribe to delivery updates to get rider assignment
      subscribeToDeliveryUpdates(newBookingId);
      
      // Optionally send a message in the chat about the booking
      if (deliveryId && recipientId) {
        await deliveryChatService.sendMessage(
          deliveryId, 
          `📦 New delivery booked! Tracking ID: ${newBookingId}\nFrom: ${pickupArea}\nTo: ${dropoffArea}\nFare: ₦${fee}`, 
          recipientId
        );
      }
      
      console.log('✅ Delivery booked successfully:', newBookingId);
      
    } catch (error) {
      console.error('Error booking delivery:', error);
      setBookingError(error.message || 'Failed to book delivery. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    // Less than 1 hour
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    }
    // More than 24 hours
    return date.toLocaleDateString();
  };
  
  // Booking functionality
  const validateFields = () => {
    setBookingError('');
    
    if (!pickupArea.trim()) {
      setBookingError('Pickup area is required');
      return false;
    }
    
    if (!dropoffArea.trim()) {
      setBookingError('Dropoff area is required');
      return false;
    }
    
    return true;
  };
  
  const fetchCoordinates = () => {
    if (!validateFields()) return false;
    
    try {
      const pickup = getAreaCoordinates(pickupArea);
      const dropoff = getAreaCoordinates(dropoffArea);
      
      if (!pickup || !hasValidCoordinates(pickup)) {
        setBookingError(`Could not find coordinates for pickup area: ${pickupArea}`);
        return false;
      }
      
      if (!dropoff || !hasValidCoordinates(dropoff)) {
        setBookingError(`Could not find coordinates for dropoff area: ${dropoffArea}`);
        return false;
      }
      
      setPickupCoords(pickup);
      setDropoffCoords(dropoff);
      return true;
    } catch (error) {
      console.error('Error fetching coordinates:', error);
      setBookingError('Error fetching location coordinates. Please try again.');
      return false;
    }
  };
  
  const calculateDistance = () => {
    if (!pickupCoords || !dropoffCoords) {
      setBookingError('Location coordinates are missing. Please try again.');
      return false;
    }
    
    try {
      // Calculate distance using Haversine formula
      const distanceKm = calculateHaversineDistance(pickupCoords, dropoffCoords);
      if (isNaN(distanceKm) || distanceKm <= 0) {
        setBookingError('Invalid distance calculation. Please check the locations.');
        return false;
      }
      
      // Estimate travel time (in minutes)
      const timeMin = estimateTravelTime(distanceKm);
      
      setDistance(distanceKm);
      setEstimatedTime(timeMin);
      return true;
    } catch (error) {
      console.error('Error calculating distance:', error);
      setBookingError('Error calculating distance. Please try again.');
      return false;
    }
  };
  
  const calculateFee = () => {
    if (distance === null || isNaN(distance)) {
      setBookingError('Invalid distance value. Please try again.');
      return false;
    }
    
    try {
      // Calculate fee based on formula: base fee + (distance * per km rate)
      const totalFee = BASE_FARE + (distance * PER_KM_RATE);
      
      // Round to nearest naira and ensure minimum fee
      const roundedFee = Math.max(Math.round(totalFee), BASE_FARE);
      setFee(roundedFee);
      return true;
    } catch (error) {
      console.error('Error calculating fee:', error);
      setBookingError('Error calculating delivery fee. Please try again.');
      return false;
    }
  };
  
  // Subscribe to updates on a delivery to track rider assignment
  const subscribeToDeliveryUpdates = (deliveryId) => {
    try {
      // Reset assignment state
      setRiderAssigned(false);
      setRiderId(null);
      setRiderName('');
      setAssignmentStatus('pending');
      
      // Create reference to the delivery document
      const deliveryRef = doc(db, "deliveries", deliveryId);
      
      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(deliveryRef, async (snapshot) => {
        if (!snapshot.exists()) return;
        
        const data = snapshot.data();
        console.log('📦 Delivery update:', data);
        
        // Check if a rider has been assigned
        if (data.status === 'assigned' && data.riderId) {
          setRiderAssigned(true);
          setRiderId(data.riderId);
          setAssignmentStatus('assigned');
          
          // Get rider details if available
          try {
            const riderDocRef = doc(db, "riders", data.riderId);
            const riderSnap = await getDoc(riderDocRef);
            
            if (riderSnap.exists()) {
              const riderData = riderSnap.data();
              setRiderName(riderData.name || 'Your Rider');
              
              // Notify in chat
              if (deliveryId && recipientId) {
                await deliveryChatService.sendMessage(
                  deliveryId, 
                  `🚴 ${riderData.name || 'A rider'} has been assigned to your delivery! They'll be on their way shortly.`, 
                  recipientId
                );
              }
            }
          } catch (riderError) {
            console.error('Error fetching rider details:', riderError);
          }
        } else if (data.status === 'pending' && data.assignmentAttempted) {
          // If rider assignment was attempted but failed
          setAssignmentStatus('failed');
        }
      });
      
      // Auto-unsubscribe after 5 minutes
      setTimeout(() => {
        unsubscribe();
      }, 5 * 60 * 1000);
      
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to delivery updates:', error);
      return null;
    }
  };

  const getMessageBubbleClass = (message) => {
    const isOwnMessage = message.senderId === user?.id;
    const baseClass = 'max-w-xs lg:max-w-md px-4 py-2 rounded-lg mb-2 break-words';
    
    if (message.messageType === 'system') {
      return `${baseClass} bg-gray-100 text-gray-600 text-center mx-auto text-sm`;
    }
    
    if (isOwnMessage) {
      return `${baseClass} bg-blue-500 text-white ml-auto`;
    }
    
    return `${baseClass} bg-gray-200 text-gray-800 mr-auto`;
  };

  const getMessageAlignment = (message) => {
    if (message.messageType === 'system') {
      return 'justify-center';
    }
    return message.senderId === user?.id ? 'justify-end' : 'justify-start';
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'rider':
        return 'bg-green-100 text-green-800';
      case 'customer':
        return 'bg-blue-100 text-blue-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
        <p className="text-gray-600 text-center">Please log in to access chat</p>
      </div>
    );
  }

  if (!deliveryId) {
    return (
      <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
        <p className="text-gray-600 text-center">No delivery selected</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="font-semibold text-gray-800">Delivery Chat</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userRole)}`}>
            {userRole}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount} new
            </span>
          )}
          <button 
            className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-colors"
            onClick={() => setShowBookingModal(true)}
          >
            Book Delivery
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500 text-center">
              No messages yet.<br />
              <span className="text-sm">Start the conversation!</span>
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${getMessageAlignment(message)}`}>
              <div className={getMessageBubbleClass(message)}>
                {/* Message content */}
                <p className="text-sm">{message.text}</p>
                
                {/* Message metadata */}
                <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                  <span>{formatMessageTime(message.timestamp)}</span>
                  {message.senderId === user?.id && message.messageType !== 'system' && (
                    <span className="ml-2">
                      {message.isRead ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
                
                {/* Role indicator for received messages */}
                {message.senderId !== user?.id && message.messageType !== 'system' && (
                  <div className="text-xs opacity-60 mt-1">
                    {message.senderRole || 'user'}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </div>
        
        {/* Character count */}
        <div className="text-xs text-gray-500 mt-1 text-right">
          {newMessage.length}/500
        </div>
      </form>
      
      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
              Book Delivery
            </h2>
            
            {bookingConfirmed ? (
              // Booking Confirmation
              <div className="space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">✅</span>
                </div>
                
                <h3 className="text-xl font-bold text-center">Booking Confirmed!</h3>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Booking ID:</span>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {bookingId}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pickup:</span>
                      <span className="font-medium text-right">
                        {pickupArea}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Dropoff:</span>
                      <span className="font-medium text-right">
                        {dropoffArea}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-medium">
                        {distance?.toFixed(1)} km
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estimated Time:</span>
                      <span className="font-medium">
                        {estimatedTime} mins
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Fare:</span>
                      <span className="font-semibold text-red-600">
                        ₦{fee?.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      {assignmentStatus === 'assigned' ? (
                        <span className="font-medium text-green-600">
                          Rider assigned
                        </span>
                      ) : assignmentStatus === 'failed' ? (
                        <span className="font-medium text-red-600">
                          Rider assignment failed
                        </span>
                      ) : (
                        <span className="font-medium text-yellow-600 flex items-center">
                          <span className="mr-1">Searching for rider</span>
                          <span className="animate-pulse">...</span>
                        </span>
                      )}
                    </div>
                    
                    {riderAssigned && riderId && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rider:</span>
                        <span className="font-medium text-green-600">
                          {riderName || 'Assigned'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold mb-2">Fare Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-gray-600">Base Fare:</span>
                    <span className="text-right">₦{BASE_FARE}</span>
                    
                    <span className="text-gray-600">Distance ({distance?.toFixed(1)} km):</span>
                    <span className="text-right">₦{(distance * PER_KM_RATE).toLocaleString()}</span>
                    
                    <span className="text-gray-600 font-medium border-t border-gray-200 pt-1 mt-1">Total:</span>
                    <span className="text-right font-semibold border-t border-gray-200 pt-1 mt-1">₦{fee?.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => {
                      window.open(`/track-delivery/${bookingId}`, '_blank');
                    }}
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>📱</span>
                    <span>Track Order</span>
                  </button>
                  
                  <div className="text-xs text-center text-gray-500">
                    Live tracking with rider location and status updates
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowBookingModal(false);
                      setBookingConfirmed(false);
                      setPickupArea('');
                      setDropoffArea('');
                    }}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              // Booking Form
              <div className="space-y-4">
                {bookingError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {bookingError}
                  </div>
                )}
                
                <div>
                  <label htmlFor="pickupArea" className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup Area *
                  </label>
                  <input
                    type="text"
                    id="pickupArea"
                    value={pickupArea}
                    onChange={(e) => setPickupArea(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Oke Ilewo"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="dropoffArea" className="block text-sm font-medium text-gray-700 mb-1">
                    Dropoff Area *
                  </label>
                  <input
                    type="text"
                    id="dropoffArea"
                    value={dropoffArea}
                    onChange={(e) => setDropoffArea(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Sapon"
                    required
                  />
                </div>
                
                <div className="pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={handleBookDelivery}
                    disabled={isBooking}
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {isBooking ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>📦</span>
                        <span>Book Now</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    disabled={isBooking}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryChatComponent;