import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getRiderEarnings } from '../../services/deliveryService';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Button,
  Collapse,
  IconButton
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReceiptIcon from '@mui/icons-material/Receipt';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocationOnIcon from '@mui/icons-material/LocationOn';

/**
 * Component to display rider earnings and completed deliveries
 */
const RiderEarnings = ({ riderId }) => {
  const { currentUser } = useAuth();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all'); // 'all', 'today', 'week', 'month'
  const [expandedDeliveries, setExpandedDeliveries] = useState({});

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₦0.00';
    return `₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Toggle delivery details expansion
  const toggleDeliveryExpand = (deliveryId) => {
    setExpandedDeliveries(prev => ({
      ...prev,
      [deliveryId]: !prev[deliveryId]
    }));
  };

  // Load rider earnings data
  useEffect(() => {
    const loadEarnings = async () => {
      if (!currentUser && !riderId) {
        setLoading(false);
        setError('You must be logged in to view earnings');
        return;
      }

      try {
        setLoading(true);
        const riderIdToUse = riderId || currentUser.uid;
        const earningsData = await getRiderEarnings(riderIdToUse, selectedTimeframe);
        setEarnings(earningsData);
        setError(null);
      } catch (err) {
        console.error('Failed to load earnings:', err);
        setError('Failed to load earnings data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadEarnings();
  }, [currentUser, riderId, selectedTimeframe]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
    );
  }

  // Empty state
  if (!earnings || !earnings.completedDeliveriesArray || earnings.completedDeliveriesArray.length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Earnings</Typography>
          <Alert severity="info">
            You haven't completed any deliveries yet. Earnings will appear here after your first completed delivery.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const filteredDeliveries = earnings.filteredDeliveries || [];
  const filteredEarningsTotal = earnings.filteredEarnings || 0;

  return (
    <Box>
      {/* Earnings Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Earnings Summary</Typography>
          
          {/* Timeframe selector */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Button 
              variant={selectedTimeframe === 'all' ? 'contained' : 'outlined'} 
              size="small"
              onClick={() => setSelectedTimeframe('all')}
            >
              All Time
            </Button>
            <Button 
              variant={selectedTimeframe === 'today' ? 'contained' : 'outlined'} 
              size="small"
              onClick={() => setSelectedTimeframe('today')}
            >
              Today
            </Button>
            <Button 
              variant={selectedTimeframe === 'week' ? 'contained' : 'outlined'} 
              size="small"
              onClick={() => setSelectedTimeframe('week')}
            >
              This Week
            </Button>
            <Button 
              variant={selectedTimeframe === 'month' ? 'contained' : 'outlined'} 
              size="small"
              onClick={() => setSelectedTimeframe('month')}
            >
              This Month
            </Button>
          </Box>
          
          {/* Stats Grid */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1">Total Earnings</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {selectedTimeframe === 'all' ? 
                    formatCurrency(earnings.totalEarned) : 
                    formatCurrency(filteredEarningsTotal)
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedTimeframe === 'all' ? 
                    'All time earnings' : 
                    `Earnings for ${selectedTimeframe === 'today' ? 'today' : 
                      selectedTimeframe === 'week' ? 'this week' : 
                      'this month'}`
                  }
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocalShippingIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1">Completed Deliveries</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {selectedTimeframe === 'all' ? 
                    earnings.completedDeliveries || 0 : 
                    filteredDeliveries.length
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedTimeframe === 'all' ? 
                    'Total completed deliveries' : 
                    `Deliveries for ${selectedTimeframe === 'today' ? 'today' : 
                      selectedTimeframe === 'week' ? 'this week' : 
                      'this month'}`
                  }
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Average stats */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Average Per Delivery</Typography>
              <Typography variant="h6">
                {formatCurrency(
                  selectedTimeframe === 'all' 
                    ? (earnings.totalEarned || 0) / (earnings.completedDeliveries || 1) 
                    : filteredDeliveries.length > 0 
                      ? filteredEarningsTotal / filteredDeliveries.length 
                      : 0
                )}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Last Completed</Typography>
              <Typography variant="h6">
                {earnings.lastDeliveryCompleted ? 
                  formatDate(earnings.lastDeliveryCompleted) : 
                  'N/A'
                }
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Recent Deliveries List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {selectedTimeframe === 'all' ? 'Recent Deliveries' : 'Filtered Deliveries'}
          </Typography>
          
          {filteredDeliveries.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              No deliveries found for the selected time period.
            </Alert>
          ) : (
            <List sx={{ width: '100%' }}>
              {filteredDeliveries.map((delivery, index) => (
                <React.Fragment key={delivery.id}>
                  <ListItem 
                    alignItems="flex-start"
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                    secondaryAction={
                      <IconButton 
                        edge="end" 
                        onClick={() => toggleDeliveryExpand(delivery.id)}
                        aria-label="expand"
                      >
                        {expandedDeliveries[delivery.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1" component="span">
                            Order #{delivery.id.substring(0, 8)}
                          </Typography>
                          <Chip 
                            size="small" 
                            color="success" 
                            label={formatCurrency(delivery.deliveryFee || 0)} 
                            icon={<AttachMoneyIcon />} 
                          />
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            {formatDate(delivery.deliveredAt)}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  
                  <Collapse in={expandedDeliveries[delivery.id]} timeout="auto" unmountOnExit>
                    <Paper elevation={0} sx={{ p: 2, ml: 2, mr: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            <LocationOnIcon fontSize="small" sx={{ mb: -0.5, mr: 0.5 }} />
                            Pickup
                          </Typography>
                          <Typography variant="body2">
                            {delivery.pickup?.address || 'Address not available'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            <LocationOnIcon fontSize="small" sx={{ mb: -0.5, mr: 0.5 }} />
                            Dropoff
                          </Typography>
                          <Typography variant="body2">
                            {delivery.dropoff?.address || 'Address not available'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Assigned
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(delivery.assignedAt)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Delivery Time
                          </Typography>
                          <Typography variant="body2">
                            {delivery.startedAt && delivery.deliveredAt ? (
                              (() => {
                                const start = delivery.startedAt.toDate ? delivery.startedAt.toDate() : new Date(delivery.startedAt);
                                const end = delivery.deliveredAt.toDate ? delivery.deliveredAt.toDate() : new Date(delivery.deliveredAt);
                                const minutes = Math.round((end - start) / (1000 * 60));
                                return `${minutes} minutes`;
                              })()
                            ) : (
                              'Time not available'
                            )}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Collapse>
                  
                  {index < filteredDeliveries.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default RiderEarnings;