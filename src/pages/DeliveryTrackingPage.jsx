import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { subscribeToDelivery } from "../services/deliveryService";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import TrackingMapOptimized from "../components/TrackingMapOptimized";
import DeliveryRatingForm from "../components/rating/DeliveryRatingForm";
import { submitDeliveryRating, isDeliveryRated } from "../services/ratingService";
import {
  Container,
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Divider,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import PersonIcon from "@mui/icons-material/Person";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

// Status steps for the stepper
const DELIVERY_STEPS = ["pending", "assigned", "enroute", "completed"];

// Emoji icons for different statuses
const STATUS_ICONS = {
  pending: "🕒",
  assigned: "🛵",
  enroute: "🚚",
  completed: "✅"
};

// Status labels (more user-friendly)
const STATUS_LABELS = {
  pending: "Order Received",
  assigned: "Rider Assigned",
  enroute: "On the Way",
  completed: "Delivered"
};

const DeliveryTrackingPage = () => {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [delivery, setDelivery] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  
  // References for cleanup
  const deliveryUnsubRef = useRef(null);
  const riderLocationUnsubRef = useRef(null);

  // Format timestamp to readable format
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      month: "short",
      day: "numeric"
    }).format(date);
  };

  // Format time elapsed
  const getTimeElapsed = (timestamp) => {
    if (!timestamp) return "";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    }
  };

  // Get active step for the stepper from delivery status
  const getActiveStep = (status) => {
    const index = DELIVERY_STEPS.indexOf(status);
    return index >= 0 ? index : 0;
  };

  // Get color based on delivery status
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "assigned":
        return "info";
      case "enroute":
        return "primary";
      case "completed":
        return "success";
      default:
        return "default";
    }
  };

  // Subscribe to delivery updates
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (!deliveryId) {
      setError("No delivery ID provided");
      setLoading(false);
      return;
    }

    console.log(`🔍 Subscribing to delivery updates for: ${deliveryId}`);
    
    // Subscribe to delivery document
    const unsubscribeDelivery = subscribeToDelivery(deliveryId, async (deliveryData) => {
      setLoading(false);
      
      if (deliveryData) {
        console.log("📦 Delivery update received:", deliveryData);
        setDelivery(deliveryData);
        
        // Check if delivery is completed and handle rating form
        if (deliveryData.status === "completed") {
          try {
            const alreadyRated = await isDeliveryRated(deliveryId);
            setHasRated(alreadyRated);
            
            // Show rating form if not already rated
            if (!alreadyRated) {
              // Small delay to let the completion message show first
              setTimeout(() => {
                setShowRatingForm(true);
              }, 2000);
            }
          } catch (error) {
            console.error('Error checking rating status:', error);
          }
        }
        
        // Subscribe to rider location if status is "enroute"
        if (deliveryData.status === "enroute" && deliveryData.riderId) {
          subscribeToRiderLocation(deliveryId);
        } else if (deliveryData.status !== "enroute" && riderLocationUnsubRef.current) {
          // Unsubscribe from rider location if status changes from "enroute"
          riderLocationUnsubRef.current();
          riderLocationUnsubRef.current = null;
        }
      } else {
        setError("Delivery not found. Please check the ID.");
      }
    });
    
    // Store unsubscribe function
    deliveryUnsubRef.current = unsubscribeDelivery;

    // Cleanup function
    return () => {
      if (deliveryUnsubRef.current) {
        deliveryUnsubRef.current();
      }
      
      if (riderLocationUnsubRef.current) {
        riderLocationUnsubRef.current();
      }
    };
  }, [deliveryId]);

  // Subscribe to rider location
  const subscribeToRiderLocation = (deliveryId) => {
    // Unsubscribe from previous subscription if exists
    if (riderLocationUnsubRef.current) {
      riderLocationUnsubRef.current();
    }
    
    console.log(`📍 Subscribing to rider location for delivery: ${deliveryId}`);
    
    // Reference to rider_locations/{deliveryId}
    const riderLocationRef = doc(db, "rider_locations", deliveryId);
    
    // Subscribe to location updates
    const unsubscribe = onSnapshot(
      riderLocationRef,
      (doc) => {
        if (doc.exists()) {
          const locationData = doc.data();
          console.log("📍 Rider location update:", locationData);
          
          if (locationData.coordinates) {
            setRiderLocation({
              lat: locationData.coordinates.latitude,
              lng: locationData.coordinates.longitude
            });
          }
        }
      },
      (error) => {
        console.error("Error subscribing to rider location:", error);
      }
    );
    
    // Store unsubscribe function
    riderLocationUnsubRef.current = unsubscribe;
  };

  // Handle go back button
  const handleGoBack = () => {
    navigate(-1);
  };

  // Handle rating form submission
  const handleRatingSubmit = async (ratingData) => {
    setIsSubmittingRating(true);
    try {
      await submitDeliveryRating(ratingData);
      setHasRated(true);
      console.log('✅ Rating submitted successfully');
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      throw error; // Let the form handle the error display
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Handle rating form cancellation
  const handleRatingCancel = () => {
    setShowRatingForm(false);
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="md" className="mt-8">
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", flexDirection: "column" }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Loading delivery information...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="md" className="mt-8">
        <Alert severity="error" sx={{ mt: 4 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button variant="outlined" onClick={handleGoBack}>
            Go Back
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Delivery Tracking
          </Typography>
          <Chip 
            label={STATUS_LABELS[delivery?.status] || "Processing"}
            color={getStatusColor(delivery?.status)}
            icon={
              delivery?.status === "completed" ? <CheckCircleIcon /> :
              delivery?.status === "enroute" ? <LocalShippingIcon /> :
              delivery?.status === "assigned" ? <PersonIcon /> :
              <PendingIcon />
            }
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Order #{deliveryId?.substring(0, 8)}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <AccessTimeIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
          Created: {formatTimestamp(delivery?.createdAt)} 
          {delivery?.createdAt && ` (${getTimeElapsed(delivery.createdAt)})`}
        </Typography>
      </Paper>

      {/* Status Stepper */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Delivery Status
        </Typography>
        
        <Stepper activeStep={getActiveStep(delivery?.status)} alternativeLabel sx={{ mt: 3 }}>
          {DELIVERY_STEPS.map((step) => (
            <Step key={step}>
              <StepLabel StepIconProps={{
                icon: STATUS_ICONS[step]
              }}>
                {STATUS_LABELS[step]}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Delivery Complete Message */}
      {delivery?.status === "completed" && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Delivery Completed!</AlertTitle>
          <Typography variant="body2" sx={{ mb: hasRated ? 0 : 2 }}>
            Your package has been delivered successfully at {formatTimestamp(delivery.deliveredAt)}.
            Thank you for using our service!
          </Typography>
          {hasRated && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ⭐ Thank you for rating this delivery!
            </Typography>
          )}
          {!hasRated && !showRatingForm && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => setShowRatingForm(true)}
              sx={{ mt: 1 }}
            >
              Rate This Delivery
            </Button>
          )}
        </Alert>
      )}

      {/* Live Tracking Map - Show only if status is enroute */}
      {delivery?.status === "enroute" && (
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Live Tracking
          </Typography>
          
          <Box sx={{ height: "400px", mt: 2, borderRadius: 2, overflow: "hidden" }}>
            <TrackingMapOptimized
              pickupLocation={delivery.pickup?.coordinates ? {
                lat: delivery.pickup.coordinates.latitude,
                lng: delivery.pickup.coordinates.longitude,
                address: delivery.pickupAddress
              } : null}
              dropoffLocation={delivery.dropoff?.coordinates ? {
                lat: delivery.dropoff.coordinates.latitude,
                lng: delivery.dropoff.coordinates.longitude,
                address: delivery.dropoffAddress
              } : null}
              riderLocation={riderLocation}
              height="400px"
            />
          </Box>
        </Paper>
      )}

      {/* Delivery Summary */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Delivery Details
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Locations */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", mb: 2 }}>
            <LocationOnIcon sx={{ color: "#4CAF50", mr: 2 }} />
            <Box>
              <Typography variant="subtitle2">Pickup Location</Typography>
              <Typography variant="body2" color="text.secondary">
                {delivery?.pickupAddress || "Not specified"}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: "flex" }}>
            <LocationOnIcon sx={{ color: "#F44336", mr: 2 }} />
            <Box>
              <Typography variant="subtitle2">Dropoff Location</Typography>
              <Typography variant="body2" color="text.secondary">
                {delivery?.dropoffAddress || "Not specified"}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Delivery Information */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          <Box>
            <Typography variant="subtitle2">Delivery Fee</Typography>
            <Typography variant="body1">
              ${delivery?.deliveryFee?.toFixed(2) || "0.00"}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="subtitle2">Distance</Typography>
            <Typography variant="body1">
              {delivery?.distance ? `${delivery.distance.toFixed(2)} km` : "N/A"}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="subtitle2">Customer</Typography>
            <Typography variant="body1">
              {delivery?.customerName || "Anonymous"}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Rider Information - Show if assigned or enroute */}
      {(delivery?.status === "assigned" || delivery?.status === "enroute") && delivery?.riderId && (
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Rider Information
          </Typography>
          
          <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
            <Box sx={{ 
              width: 50, 
              height: 50, 
              borderRadius: "50%", 
              backgroundColor: "#e3f2fd", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: "24px", 
              mr: 2 
            }}>
              🛵
            </Box>
            
            <Box>
              <Typography variant="subtitle1">
                {delivery.riderName || `Rider #${delivery.riderId.substring(0, 6)}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently {delivery.status === "enroute" ? "on the way" : "assigned to your delivery"}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Action Button */}
      <Box sx={{ textAlign: "center", mt: 3 }}>
        <Button variant="outlined" onClick={handleGoBack} sx={{ minWidth: 120 }}>
          Back
        </Button>
      </Box>

      {/* Rating Form Modal */}
      {showRatingForm && delivery?.status === "completed" && (
        <DeliveryRatingForm
          deliveryId={deliveryId}
          riderId={delivery.riderId}
          riderName={delivery.riderName || `Rider #${delivery.riderId?.substring(0, 6)}`}
          onSubmit={handleRatingSubmit}
          onCancel={handleRatingCancel}
          isSubmitting={isSubmittingRating}
        />
      )}
    </Container>
  );
};

export default DeliveryTrackingPage;