import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Avatar,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Star as StarIcon,
  Warning as WarningIcon,
  Flag as FlagIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { getRiderRatingStats, getRiderProfile, getRiderRatings } from '../../services/ratingService';

const AdminRiderRatings = () => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('averageRating');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderDetails, setRiderDetails] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadRiderRatings();
  }, []);

  const loadRiderRatings = async () => {
    try {
      setLoading(true);
      setError(null);

      const ridersData = await getRiderRatingStats();
      setRiders(ridersData);

    } catch (error) {
      console.error('Error loading rider ratings:', error);
      setError('Failed to load rider ratings');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    const isAsc = sortBy === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(field);
  };

  const handleViewDetails = async (rider) => {
    try {
      setSelectedRider(rider);
      setShowDetailsDialog(true);
      
      const [profile, ratings] = await Promise.all([
        getRiderProfile(rider.id),
        getRiderRatings(rider.id)
      ]);

      setRiderDetails({ profile, ratings });

    } catch (error) {
      console.error('Error loading rider details:', error);
      setError('Failed to load rider details');
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'success';
    if (rating >= 4.0) return 'primary';
    if (rating >= 3.5) return 'warning';
    return 'error';
  };

  const getPerformanceFlag = (rider) => {
    if (rider.averageRating < 3.5 && rider.ratingCount >= 5) {
      return { type: 'error', label: 'Low Performer', icon: <WarningIcon /> };
    }
    if (rider.averageRating < 4.0 && rider.ratingCount >= 10) {
      return { type: 'warning', label: 'Needs Attention', icon: <FlagIcon /> };
    }
    if (rider.averageRating >= 4.8 && rider.ratingCount >= 20) {
      return { type: 'success', label: 'Top Performer', icon: <TrendingUpIcon /> };
    }
    return null;
  };

  const filteredAndSortedRiders = riders
    .filter(rider => {
      // Search filter
      const matchesSearch = rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           rider.phone?.includes(searchTerm);

      // Rating filter
      const matchesRating = filterRating === 'all' ||
        (filterRating === 'excellent' && rider.averageRating >= 4.5) ||
        (filterRating === 'good' && rider.averageRating >= 4.0 && rider.averageRating < 4.5) ||
        (filterRating === 'average' && rider.averageRating >= 3.5 && rider.averageRating < 4.0) ||
        (filterRating === 'poor' && rider.averageRating < 3.5) ||
        (filterRating === 'unrated' && rider.ratingCount === 0);

      return matchesSearch && matchesRating;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'lastRatedAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const lowPerformers = riders.filter(rider => 
    rider.averageRating < 3.5 && rider.ratingCount >= 5
  );

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading rider ratings...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header and Stats */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Rider Ratings & Performance
        </Typography>
        <Button variant="outlined" onClick={loadRiderRatings}>
          Refresh Data
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Performance Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {riders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Riders
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {riders.filter(r => r.averageRating >= 4.5).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Top Performers (4.5+)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {riders.filter(r => r.averageRating >= 3.5 && r.averageRating < 4.0).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Need Attention (3.5-4.0)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {lowPerformers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Low Performers (&lt;3.5)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Low Performer Alert */}
      {lowPerformers.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            ⚠️ {lowPerformers.length} rider{lowPerformers.length !== 1 ? 's' : ''} require immediate attention
          </Typography>
          <Typography variant="body2">
            Riders with ratings below 3.5 and at least 5 reviews: {lowPerformers.map(r => r.name).join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Filters and Search */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search riders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Filter by Rating</InputLabel>
              <Select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                label="Filter by Rating"
              >
                <MenuItem value="all">All Ratings</MenuItem>
                <MenuItem value="excellent">Excellent (4.5+)</MenuItem>
                <MenuItem value="good">Good (4.0-4.5)</MenuItem>
                <MenuItem value="average">Average (3.5-4.0)</MenuItem>
                <MenuItem value="poor">Poor (&lt;3.5)</MenuItem>
                <MenuItem value="unrated">Unrated</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={5}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredAndSortedRiders.length} of {riders.length} riders
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Riders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rider</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'averageRating'}
                  direction={sortBy === 'averageRating' ? sortOrder : 'asc'}
                  onClick={() => handleSort('averageRating')}
                >
                  Average Rating
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'ratingCount'}
                  direction={sortBy === 'ratingCount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('ratingCount')}
                >
                  Total Reviews
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'lastRatedAt'}
                  direction={sortBy === 'lastRatedAt' ? sortOrder : 'asc'}
                  onClick={() => handleSort('lastRatedAt')}
                >
                  Last Rated
                </TableSortLabel>
              </TableCell>
              <TableCell>Performance</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedRiders.map((rider) => {
              const flag = getPerformanceFlag(rider);
              return (
                <TableRow key={rider.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {rider.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {rider.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {rider.phone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Chip
                        label={rider.averageRating > 0 ? rider.averageRating.toFixed(1) : '—'}
                        color={getRatingColor(rider.averageRating)}
                        size="small"
                        icon={<StarIcon />}
                      />
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {rider.ratingCount}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(rider.lastRatedAt)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {flag && (
                      <Chip
                        label={flag.label}
                        color={flag.type}
                        size="small"
                        icon={flag.icon}
                      />
                    )}
                  </TableCell>

                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(rider)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Rider Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Rider Rating Details: {selectedRider?.name}
        </DialogTitle>
        <DialogContent>
          {riderDetails ? (
            <Box>
              {/* Rating Summary */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {riderDetails.profile.averageRating?.toFixed(1) || '—'}
                      </Typography>
                      <Typography variant="body2">Average Rating</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="secondary">
                        {riderDetails.profile.ratingCount || 0}
                      </Typography>
                      <Typography variant="body2">Total Reviews</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {riderDetails.profile.completedDeliveries || 0}
                      </Typography>
                      <Typography variant="body2">Completed</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Recent Ratings */}
              <Typography variant="h6" gutterBottom>Recent Reviews</Typography>
              {riderDetails.ratings.slice(0, 5).map((rating, index) => (
                <Box key={rating.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Box display="flex" mr={2}>
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
                  {rating.feedback && (
                    <Typography variant="body2">
                      "{rating.feedback}"
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminRiderRatings;