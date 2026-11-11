import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RiderDashboard from '../components/rider/RiderDashboard';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  Container, 
  Typography, 
  Box, 
  Alert, 
  Paper, 
  CircularProgress,
  Breadcrumbs,
  Link,
  Divider
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

/**
 * Page component that hosts the rider dashboard and related functionality
 */
const RiderPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [riderData, setRiderData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Fetch rider data
  useEffect(() => {
    const fetchRiderData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const riderDoc = await getDoc(doc(db, 'riders', currentUser.uid));
        
        if (riderDoc.exists()) {
          setRiderData(riderDoc.data());
        } else {
          // User exists but is not a rider
          setError('Your account does not have rider privileges.');
        }
      } catch (err) {
        console.error('Error fetching rider data:', err);
        setError('Failed to load rider information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRiderData();
  }, [currentUser]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login', { state: { from: '/rider', message: 'You must be logged in to access the rider dashboard.' } });
    }
  }, [authLoading, currentUser, navigate]);

  // Show loading state while authentication state is being determined
  if (authLoading || loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // If there's an error or user is not a rider
  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link component="button" onClick={() => navigate('/')} sx={{ cursor: 'pointer' }}>
            Return to Home
          </Link>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', pt: 2, pb: 4 }}>
      <Container maxWidth="lg">
        {/* Breadcrumbs Navigation */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link 
            underline="hover" 
            color="inherit" 
            onClick={() => navigate('/')} 
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Typography 
            color="text.primary" 
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <LocalShippingIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Rider Dashboard
          </Typography>
        </Breadcrumbs>

        {/* Rider Status Card */}
        {riderData && (
          <Paper 
            elevation={1} 
            sx={{ 
              p: 3, 
              mb: 3, 
              borderRadius: 2,
              backgroundColor: riderData.available ? '#e8f5e9' : '#ffebee'
            }}
          >
            <Typography variant="h5" gutterBottom>
              Welcome, {riderData.name || currentUser.displayName || 'Rider'}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Alert severity={riderData.available ? "success" : "info"}>
                {riderData.available 
                  ? "You are currently AVAILABLE for new deliveries." 
                  : "You are currently UNAVAILABLE for new deliveries."}
              </Alert>
              <Box sx={{ 
                backgroundColor: riderData.available ? '#4caf50' : '#f44336', 
                width: 15, 
                height: 15, 
                borderRadius: '50%' 
              }} />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Typography variant="body1">
                <strong>Vehicle:</strong> {riderData.vehicleType || 'Not specified'}
              </Typography>
              <Typography variant="body1">
                <strong>Phone:</strong> {riderData.phone || 'Not specified'}
              </Typography>
              <Typography variant="body1">
                <strong>Rating:</strong> {riderData.rating ? `${riderData.rating}/5` : 'New Rider'}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Rider Dashboard */}
        <RiderDashboard />
      </Container>
    </Box>
  );
};

export default RiderPage;