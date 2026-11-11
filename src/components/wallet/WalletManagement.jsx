import React, { useState } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Container,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import { 
  Person as RiderIcon,
  Store as VendorIcon 
} from '@mui/icons-material';
import RiderWalletDashboard from './RiderWalletDashboard';
import VendorWalletDashboard from './VendorWalletDashboard';

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`wallet-tabpanel-${index}`}
      aria-labelledby={`wallet-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const WalletManagement = ({ 
  userType = 'rider', // 'rider' or 'vendor'
  userId, 
  userName,
  riderId, 
  riderName,
  vendorId, 
  vendorName 
}) => {
  const [activeTab, setActiveTab] = useState(userType === 'vendor' ? 1 : 0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Determine which dashboards to show based on user permissions
  const canViewRider = riderId || (userType === 'rider' && userId);
  const canViewVendor = vendorId || (userType === 'vendor' && userId);
  
  // If user can only view one type, show that directly
  if (canViewRider && !canViewVendor) {
    return (
      <Container maxWidth="xl">
        <RiderWalletDashboard 
          riderId={riderId || userId}
          riderName={riderName || userName}
        />
      </Container>
    );
  }

  if (canViewVendor && !canViewRider) {
    return (
      <Container maxWidth="xl">
        <VendorWalletDashboard 
          vendorId={vendorId || userId}
          vendorName={vendorName || userName}
        />
      </Container>
    );
  }

  // If user can view both or is admin, show tabs
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Wallet Management
        </Typography>
        
        <Card elevation={2}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              aria-label="wallet management tabs"
              variant="fullWidth"
            >
              {canViewRider && (
                <Tab 
                  icon={<RiderIcon />} 
                  label="Rider Wallet" 
                  id="wallet-tab-0"
                  aria-controls="wallet-tabpanel-0"
                />
              )}
              {canViewVendor && (
                <Tab 
                  icon={<VendorIcon />} 
                  label="Vendor Wallet" 
                  id="wallet-tab-1"
                  aria-controls="wallet-tabpanel-1"
                />
              )}
            </Tabs>
          </Box>

          {canViewRider && (
            <TabPanel value={activeTab} index={0}>
              <RiderWalletDashboard 
                riderId={riderId || userId}
                riderName={riderName || userName}
              />
            </TabPanel>
          )}

          {canViewVendor && (
            <TabPanel value={activeTab} index={canViewRider ? 1 : 0}>
              <VendorWalletDashboard 
                vendorId={vendorId || userId}
                vendorName={vendorName || userName}
              />
            </TabPanel>
          )}
        </Card>

        {!canViewRider && !canViewVendor && (
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" textAlign="center">
                No wallet access permissions found. Please contact your administrator.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default WalletManagement;