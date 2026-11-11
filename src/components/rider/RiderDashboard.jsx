import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import RiderDeliveryCard from './RiderDeliveryCard';
import { 
  Container, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  CircularProgress, 
  Alert, 
  Paper, 
  Divider,
  Badge 
} from '@mui/material';
import PendingIcon from '@mui/icons-material/Pending';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { IconButton } from '@mui/material';

/**
 * Dashboard component for riders to view and manage their deliveries
 */
const RiderDashboard = () => {
  const { currentUser } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filter deliveries based on current tab
  const filteredDeliveries = () => {
    switch (tabValue) {
      case 0: // All
        return deliveries;
      case 1: // Assigned
        return deliveries.filter(d => d.status === 'assigned');
      case 2: // In Progress
        return deliveries.filter(d => d.status === 'enroute');
      case 3: // Completed
        return deliveries.filter(d => d.status === 'completed');
      default:
        return deliveries;
    }
  };

  // Count deliveries for badges
  const getDeliveryCount = (status) => {
    return deliveries.filter(d => d.status === status).length;
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Trigger a refresh of the data
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Listen for deliveries assigned to the current rider
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    // Create a query to get deliveries assigned to the current rider
    const q = query(
      collection(db, 'deliveries'),
      where('riderId', '==', currentUser.uid)
    );

    // Subscribe to query
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const deliveriesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => {
          // Sort by status priority and then by creation time (newest first)
          const statusPriority = {
            'assigned': 1,
            'enroute': 2,
            'pending': 3,
            'completed': 4
          };
          
          const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
          if (priorityDiff !== 0) return priorityDiff;
          
          // If same status, sort by creation time (newest first)
          const aTime = a.createdAt ? a.createdAt.toDate?.() || new Date(a.createdAt) : new Date(0);
          const bTime = b.createdAt ? b.createdAt.toDate?.() || new Date(b.createdAt) : new Date(0);
          return bTime - aTime;
        });
        
        setDeliveries(deliveriesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching deliveries:', err);
        setError('Failed to load deliveries. Please refresh the page.');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [currentUser, refreshTrigger]);

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">You must be logged in to view your dashboard.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Rider Dashboard
        </Typography>
        <IconButton onClick={handleRefresh} aria-label="refresh" color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="fullWidth" 
          indicatorColor="primary"
          textColor="primary"
          aria-label="delivery status tabs"
        >
          <Tab 
            label="All" 
            icon={<Badge badgeContent={deliveries.length} color="primary">
              <PendingIcon />
            </Badge>} 
          />
          <Tab 
            label="Assigned" 
            icon={<Badge badgeContent={getDeliveryCount('assigned')} color="info">
              <PendingIcon />
            </Badge>} 
          />
          <Tab 
            label="In Progress" 
            icon={<Badge badgeContent={getDeliveryCount('enroute')} color="primary">
              <LocalShippingIcon />
            </Badge>} 
          />
          <Tab 
            label="Completed" 
            icon={<Badge badgeContent={getDeliveryCount('completed')} color="success">
              <CheckCircleIcon />
            </Badge>} 
          />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : filteredDeliveries().length === 0 ? (
        <Alert severity="info" sx={{ my: 2 }}>
          No deliveries found in this category.
        </Alert>
      ) : (
        <Box>
          {filteredDeliveries().map(delivery => (
            <RiderDeliveryCard
              key={delivery.id}
              delivery={delivery}
              riderId={currentUser.uid}
              onStatusUpdate={handleRefresh}
            />
          ))}
        </Box>
      )}
    </Container>
  );
};

export default RiderDashboard;