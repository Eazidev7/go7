import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  LinearProgress,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  LocalShipping as DeliveryIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon
} from '@mui/icons-material';
import { getRiderProfile, getRiderRatings } from '../../services/ratingService';

const RiderRatingStats = ({ riderId }) => {
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (riderId) {
      loadRiderData();
    }
  }, [riderId]);

  const loadRiderData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileData, ratingsData] = await Promise.all([
        getRiderProfile(riderId),
        getRiderRatings(riderId)
      ]);

      setProfile(profileData);
      setRatings(ratingsData.slice(0, 5)); // Show last 5 ratings

    } catch (error) {
      console.error('Error loading rider rating data:', error);
      setError('Failed to load rating data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate rating distribution
  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
      distribution[rating.rating] = (distribution[rating.rating] || 0) + 1;
    });
    return distribution;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Get star color based on rating
  const getStarColor = (rating) => {
    if (rating >= 4.5) return '#4caf50';
    if (rating >= 4.0) return '#8bc34a';
    if (rating >= 3.5) return '#ffc107';
    if (rating >= 3.0) return '#ff9800';
    return '#f44336';
  };

  // Get performance level text
  const getPerformanceLevel = (rating) => {
    if (rating >= 4.8) return 'Exceptional';
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Very Good';
    if (rating >= 3.5) return 'Good';
    if (rating >= 3.0) return 'Fair';
    return 'Needs Improvement';
  };

  // Get performance color
  const getPerformanceColor = (rating) => {
    if (rating >= 4.5) return 'success';
    if (rating >= 4.0) return 'primary';
    if (rating >= 3.5) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading rating data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  const averageRating = profile?.averageRating || 0;
  const ratingCount = profile?.ratingCount || 0;
  const distribution = getRatingDistribution();

  return (
    <Box>
      {/* Overall Rating Summary */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <StarIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#ffc107' }} />
          Your Rating Overview
        </Typography>

        <Grid container spacing={3} alignItems="center">
          {/* Average Rating Display */}
          <Grid item xs={12} md={4}>
            <Box textAlign="center">
              <Typography 
                variant="h2" 
                component="div" 
                sx={{ 
                  color: getStarColor(averageRating),
                  fontWeight: 'bold',
                  mb: 1
                }}
              >
                {averageRating > 0 ? averageRating.toFixed(1) : '—'}
              </Typography>
              
              <Box display="flex" justifyContent="center" mb={1}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    sx={{
                      color: star <= averageRating ? '#ffc107' : '#e0e0e0',
                      fontSize: '1.5rem',
                      mx: 0.2
                    }}
                  />
                ))}
              </Box>

              <Typography variant="body2" color="text.secondary">
                Based on {ratingCount} rating{ratingCount !== 1 ? 's' : ''}
              </Typography>

              <Chip 
                label={getPerformanceLevel(averageRating)}
                color={getPerformanceColor(averageRating)}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>

          {/* Rating Distribution */}
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle2" gutterBottom>
              Rating Distribution
            </Typography>
            
            {[5, 4, 3, 2, 1].map((stars) => (
              <Box key={stars} display="flex" alignItems="center" mb={1}>
                <Typography variant="body2" sx={{ minWidth: 40 }}>
                  {stars} ★
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={ratingCount > 0 ? (distribution[stars] / ratingCount) * 100 : 0}
                  sx={{ 
                    flexGrow: 1, 
                    mx: 1, 
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getStarColor(stars)
                    }
                  }}
                />
                <Typography variant="body2" sx={{ minWidth: 30 }}>
                  {distribution[stars]}
                </Typography>
              </Box>
            ))}
          </Grid>
        </Grid>
      </Paper>

      {/* Performance Insights */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                <DeliveryIcon />
              </Avatar>
              <Typography variant="h6">
                {profile?.completedDeliveries || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Deliveries
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                <ThumbUpIcon />
              </Avatar>
              <Typography variant="h6">
                {ratingCount > 0 ? Math.round((distribution[4] + distribution[5]) / ratingCount * 100) : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Positive Reviews
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'secondary.main', mx: 'auto', mb: 1 }}>
                <TrendingUpIcon />
              </Avatar>
              <Typography variant="h6">
                {profile?.lastRatedAt ? formatDate(profile.lastRatedAt) : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Rated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Feedback */}
      {ratings.length > 0 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <CommentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Recent Customer Feedback
          </Typography>

          <List>
            {ratings.map((rating, index) => (
              <React.Fragment key={rating.id}>
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getStarColor(rating.rating) }}>
                      <Typography variant="body2" color="white" fontWeight="bold">
                        {rating.rating}
                      </Typography>
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <Box display="flex" mr={1}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                              key={star}
                              sx={{
                                color: star <= rating.rating ? '#ffc107' : '#e0e0e0',
                                fontSize: '1rem'
                              }}
                            />
                          ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(rating.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      rating.feedback ? (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          "{rating.feedback}"
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          No written feedback provided
                        </Typography>
                      )
                    }
                  />
                </ListItem>
                {index < ratings.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>

          {ratingCount > 5 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              Showing latest 5 of {ratingCount} total ratings
            </Typography>
          )}
        </Paper>
      )}

      {/* No Ratings State */}
      {ratingCount === 0 && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <StarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Ratings Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete your first delivery to start receiving customer ratings and feedback.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default RiderRatingStats;