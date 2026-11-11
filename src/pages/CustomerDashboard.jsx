import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Avatar,
  Divider
} from '@mui/material';
import {
  AccountBalanceWallet,
  LocalShipping,
  History as HistoryIcon,
  Person,
  Assignment,
  AddCircleOutline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
// import { useAuthContext } from '../contexts/AuthContext'; // TEMPORARILY COMMENTED - FILE MISSING
// import CustomerWallet from '../components/CustomerWallet'; // TEMPORARILY COMMENTED - AUTH CONTEXT DEPENDENCY

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  // const { user } = useAuthContext(); // TEMPORARILY COMMENTED - AUTH CONTEXT MISSING
  const user = { displayName: 'Demo User', uid: 'demo-123' }; // Mock user for now

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const quickActions = [
    {
      title: 'Book a Delivery',
      description: 'Send packages, documents, or food',
      icon: <LocalShipping color="primary" />,
      action: () => navigate('/book'),
      color: 'primary.main'
    },
    {
      title: 'Track Order',
      description: 'Check the status of your deliveries',
      icon: <HistoryIcon color="info" />,
      action: () => navigate('/track'),
      color: 'info.main'
    },
    {
      title: 'Top Up Wallet',
      description: 'Add money to your wallet for quick payments',
      icon: <AddCircleOutline color="success" />,
      action: () => setActiveTab(1), // Switch to wallet tab
      color: 'success.main'
    }
  ];

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Please sign in to access your dashboard
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Go to Home Page
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={4}>
        <Avatar 
          sx={{ 
            width: 64, 
            height: 64, 
            mr: 3,
            bgcolor: 'primary.main',
            fontSize: '1.5rem'
          }}
        >
          {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back, {user.displayName || 'Customer'}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your deliveries and wallet from your personal dashboard
          </Typography>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                },
                transition: 'all 0.3s ease'
              }}
              onClick={action.action}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      borderRadius: '50%', 
                      bgcolor: action.color + '20',
                      mr: 2
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Typography variant="h6" component="h3">
                    {action.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="customer dashboard tabs">
            <Tab 
              icon={<Assignment />} 
              label="My Orders" 
              id="customer-tab-0"
              aria-controls="customer-tabpanel-0"
            />
            <Tab 
              icon={<AccountBalanceWallet />} 
              label="My Wallet" 
              id="customer-tab-1"
              aria-controls="customer-tabpanel-1"
            />
            <Tab 
              icon={<Person />} 
              label="Profile" 
              id="customer-tab-2"
              aria-controls="customer-tabpanel-2"
            />
          </Tabs>
        </Box>

        {/* My Orders Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box textAlign="center" py={8}>
            <LocalShipping sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Order History Coming Soon
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We're working on a comprehensive order history feature. For now, you can track your active orders using the tracking page.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<HistoryIcon />}
              onClick={() => navigate('/track')}
            >
              Track Current Orders
            </Button>
          </Box>
        </TabPanel>

        {/* My Wallet Tab */}
        <TabPanel value={activeTab} index={1}>
          {/* <CustomerWallet /> */}
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Wallet Feature</Typography>
            <Typography color="text.secondary">Wallet integration coming soon</Typography>
          </Box>
        </TabPanel>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Personal Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body1">
                        {user.displayName || 'Not provided'}
                      </Typography>
                    </Box>
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1">
                        {user.email || 'Not provided'}
                      </Typography>
                    </Box>
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography variant="body1">
                        {user.phoneNumber || 'Not provided'}
                      </Typography>
                    </Box>
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Account Created
                      </Typography>
                      <Typography variant="body1">
                        {user.metadata?.creationTime 
                          ? new Date(user.metadata.creationTime).toLocaleDateString()
                          : 'Unknown'
                        }
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Account Settings
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box textAlign="center" py={4}>
                      <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary" paragraph>
                        Profile management features are coming soon. You'll be able to update your personal information, preferences, and security settings.
                      </Typography>
                      <Button variant="outlined" disabled>
                        Edit Profile (Coming Soon)
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default CustomerDashboard;