import React from 'react';
import { riderAcceptsDelivery, completeDelivery } from '../../services/deliveryService';
import { Button, Card, CardContent, Typography, Box, Chip, Grid } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

/**
 * A card component to display a single delivery for riders
 * @param {Object} delivery - The delivery object with all details
 * @param {Function} onStatusUpdate - Callback for when delivery status changes
 * @param {String} riderId - The current rider's ID
 */
const RiderDeliveryCard = ({ delivery, onStatusUpdate, riderId }) => {
  // Format timestamp to a readable date and time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  // Calculate how long ago the delivery was created
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
  };

  // Get the status chip color based on delivery status
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'assigned':
        return 'info';
      case 'enroute':
        return 'primary';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  // Handle accepting a delivery
  const handleAcceptDelivery = async () => {
    try {
      await riderAcceptsDelivery(delivery.id, riderId);
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error('Error accepting delivery:', error);
      alert('Failed to accept delivery. Please try again.');
    }
  };

  // Handle completing a delivery
  const handleCompleteDelivery = async () => {
    try {
      await completeDelivery(delivery.id, riderId);
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Failed to mark delivery as completed. Please try again.');
    }
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        borderLeft: `5px solid ${
          delivery.status === 'pending' ? '#ff9800' : 
          delivery.status === 'assigned' ? '#2196f3' : 
          delivery.status === 'enroute' ? '#3f51b5' : 
          delivery.status === 'completed' ? '#4caf50' : '#9e9e9e'
        }`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="div">
            Order #{delivery.id.substring(0, 6)}
          </Typography>
          <Chip 
            label={delivery.status.toUpperCase()} 
            color={getStatusColor(delivery.status)}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <AccessTimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
          Created: {formatTimestamp(delivery.createdAt)} ({getTimeAgo(delivery.createdAt)})
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <LocationOnIcon fontSize="small" sx={{ mt: 0.5, mr: 1, color: '#f44336' }} />
              <Box>
                <Typography variant="subtitle2">Pickup</Typography>
                <Typography variant="body2">{delivery.pickupAddress}</Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <LocationOnIcon fontSize="small" sx={{ mt: 0.5, mr: 1, color: '#4caf50' }} />
              <Box>
                <Typography variant="subtitle2">Dropoff</Typography>
                <Typography variant="body2">{delivery.dropoffAddress}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2">
              {delivery.customerName || 'Customer'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AttachMoneyIcon fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2" fontWeight="bold">
              ${delivery.deliveryFee ? delivery.deliveryFee.toFixed(2) : '0.00'}
            </Typography>
          </Box>
        </Box>

        {delivery.distance && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Distance: {delivery.distance.toFixed(2)} km
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          {delivery.status === 'assigned' && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<LocalShippingIcon />}
              onClick={handleAcceptDelivery}
            >
              Accept & Start Delivery
            </Button>
          )}
          
          {delivery.status === 'enroute' && (
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<CheckCircleIcon />}
              onClick={handleCompleteDelivery}
            >
              Mark as Delivered
            </Button>
          )}
          
          {delivery.status === 'completed' && (
            <Chip 
              label="Completed" 
              color="success" 
              icon={<CheckCircleIcon />}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default RiderDeliveryCard;