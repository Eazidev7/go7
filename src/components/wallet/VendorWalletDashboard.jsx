import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Grid, 
  Box, 
  Avatar, 
  Chip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import {
  Store as VendorIcon,
  TrendingDown as SpendIcon,
  Receipt as PayoutIcon,
  Analytics as AnalyticsIcon,
  History as HistoryIcon,
  CreditCard as CardIcon,
  LocalShipping as DeliveryIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { 
  getVendorPayouts, 
  getVendorPaymentHistory, 
  getWalletStatistics,
  getUserPaymentMethods,
  addPaymentMethod 
} from '../services/walletService';

const VendorWalletDashboard = ({ vendorId, vendorName }) => {
  // State management
  const [payouts, setPayouts] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  });
  
  // Payment method dialog state
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'bank',
    accountName: '',
    accountNumber: '',
    bankName: '',
    phoneNumber: ''
  });

  // Load wallet data
  useEffect(() => {
    loadWalletData();
  }, [vendorId, dateRange]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [payoutsData, paymentHistoryData, statisticsData, paymentMethodsData] = await Promise.all([
        getVendorPayouts(vendorId),
        getVendorPaymentHistory(vendorId, 20),
        getWalletStatistics(vendorId, dateRange.startDate, dateRange.endDate),
        getUserPaymentMethods(vendorId)
      ]);

      setPayouts(payoutsData);
      setPaymentHistory(paymentHistoryData);
      setStatistics(statisticsData);
      setPaymentMethods(paymentMethodsData);

    } catch (error) {
      console.error('Error loading wallet data:', error);
      setError('Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding payment method
  const handleAddPaymentMethod = async () => {
    try {
      await addPaymentMethod(vendorId, newPaymentMethod);
      await loadWalletData(); // Refresh payment methods
      
      // Reset form and close dialog
      setNewPaymentMethod({
        type: 'bank',
        accountName: '',
        accountNumber: '',
        bankName: '',
        phoneNumber: ''
      });
      setPaymentMethodDialogOpen(false);
      
      alert('Payment method added successfully!');

    } catch (error) {
      console.error('Error adding payment method:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  // Get payment type color
  const getPaymentTypeColor = (type) => {
    switch (type) {
      case 'delivery_fee': return 'primary';
      case 'commission': return 'secondary';
      case 'refund': return 'success';
      case 'penalty': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading wallet data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
        <Button onClick={loadWalletData} variant="outlined" size="small" sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <VendorIcon />
        </Avatar>
        <Box>
          <Typography variant="h4" component="h1">
            Vendor Wallet
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {vendorName || `Vendor #${vendorId?.substring(0, 8)}`}
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        {/* Total Delivery Spend */}
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <SpendIcon />
                </Avatar>
                <Typography variant="h6">Total Spend</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {formatCurrency(payouts?.totalDeliverySpend)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This month: {formatCurrency(payouts?.currentMonthSpend)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Outstanding Balance */}
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <PayoutIcon />
                </Avatar>
                <Typography variant="h6">Outstanding</Typography>
              </Box>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {formatCurrency(payouts?.outstandingBalance)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending payment
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Deliveries This Month */}
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <DeliveryIcon />
                </Avatar>
                <Typography variant="h6">Deliveries</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {payouts?.deliveryCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg cost: {formatCurrency(payouts?.averageCostPerDelivery)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Commission Rate */}
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <MoneyIcon />
                </Avatar>
                <Typography variant="h6">Commission</Typography>
              </Box>
              <Typography variant="h4" color="secondary" gutterBottom>
                {payouts?.currentCommissionRate || 15}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Platform fee rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Breakdown */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Financial Breakdown
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Total Deliveries</Typography>
              <Typography variant="h6">{payouts?.totalDeliveries || 0}</Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Delivery Fees</Typography>
              <Typography variant="h6">{formatCurrency(payouts?.totalDeliveryFees)}</Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Platform Commission</Typography>
              <Typography variant="h6" color="secondary.main">
                {formatCurrency(payouts?.totalCommission)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Net Spend</Typography>
              <Typography variant="h6">{formatCurrency(payouts?.netSpend)}</Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Paid Amount</Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(payouts?.totalPaid)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Outstanding</Typography>
              <Typography variant="h6" color="warning.main">
                {formatCurrency(payouts?.outstandingBalance)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Card elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Payment History" />
            <Tab label="Analytics" />
            <Tab label="Payment Methods" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Payment History Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Payments
              </Typography>

              {paymentHistory.length === 0 ? (
                <Alert severity="info">No payment history found.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Method</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.createdAt)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={payment.type?.replace('_', ' ') || 'Payment'} 
                              color={getPaymentTypeColor(payment.type)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{payment.description || 'Delivery payment'}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={payment.status} 
                              color={getStatusColor(payment.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{payment.paymentMethod || 'Bank'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Analytics Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Analytics & Insights
              </Typography>

              {statistics ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>Delivery Trends</Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Average daily deliveries: {Math.round((statistics.totalDeliveries || 0) / 30)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Peak delivery day: {statistics.peakDay || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Growth rate: {statistics.growthRate || 0}%
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>Cost Analysis</Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Avg delivery cost: {formatCurrency(statistics.averageDeliveryCost)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Commission paid: {formatCurrency(statistics.totalCommission)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cost efficiency: {statistics.costEfficiency || 'N/A'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>Monthly Summary</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="text.secondary">This Month</Typography>
                          <Typography variant="h6">{formatCurrency(statistics.currentMonthSpend)}</Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="text.secondary">Last Month</Typography>
                          <Typography variant="h6">{formatCurrency(statistics.lastMonthSpend)}</Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="text.secondary">Monthly Change</Typography>
                          <Typography variant="h6" color={statistics.monthlyChange >= 0 ? 'success.main' : 'error.main'}>
                            {statistics.monthlyChange >= 0 ? '+' : ''}{statistics.monthlyChange || 0}%
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="text.secondary">Projected</Typography>
                          <Typography variant="h6">{formatCurrency(statistics.projectedMonthlySpend)}</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">No analytics data available for the selected period.</Alert>
              )}
            </Box>
          )}

          {/* Payment Methods Tab */}
          {activeTab === 2 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  <CardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Payment Methods
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CardIcon />}
                  onClick={() => setPaymentMethodDialogOpen(true)}
                >
                  Add Payment Method
                </Button>
              </Box>

              {paymentMethods.length === 0 ? (
                <Alert severity="info">No payment methods configured.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {paymentMethods.map((method) => (
                    <Grid item xs={12} md={6} key={method.id}>
                      <Paper sx={{ p: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box>
                            <Typography variant="subtitle1">
                              {method.type === 'bank' ? 'Bank Account' : 'Mobile Money'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {method.accountName}
                            </Typography>
                            {method.type === 'bank' ? (
                              <>
                                <Typography variant="body2">{method.bankName}</Typography>
                                <Typography variant="body2">****{method.accountNumber?.slice(-4)}</Typography>
                              </>
                            ) : (
                              <Typography variant="body2">{method.phoneNumber}</Typography>
                            )}
                          </Box>
                          <Chip 
                            label={method.isDefault ? 'Default' : 'Active'} 
                            color={method.isDefault ? 'primary' : 'default'}
                            size="small"
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Dialog */}
      <Dialog open={paymentMethodDialogOpen} onClose={() => setPaymentMethodDialogOpen(false)}>
        <DialogTitle>Add Payment Method</DialogTitle>
        <DialogContent>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Payment Type</InputLabel>
            <Select
              value={newPaymentMethod.type}
              onChange={(e) => setNewPaymentMethod({...newPaymentMethod, type: e.target.value})}
              label="Payment Type"
            >
              <MenuItem value="bank">Bank Account</MenuItem>
              <MenuItem value="mobile_money">Mobile Money</MenuItem>
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label="Account Name"
            fullWidth
            variant="outlined"
            value={newPaymentMethod.accountName}
            onChange={(e) => setNewPaymentMethod({...newPaymentMethod, accountName: e.target.value})}
            sx={{ mb: 2 }}
          />

          {newPaymentMethod.type === 'bank' ? (
            <>
              <TextField
                margin="dense"
                label="Bank Name"
                fullWidth
                variant="outlined"
                value={newPaymentMethod.bankName}
                onChange={(e) => setNewPaymentMethod({...newPaymentMethod, bankName: e.target.value})}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Account Number"
                fullWidth
                variant="outlined"
                value={newPaymentMethod.accountNumber}
                onChange={(e) => setNewPaymentMethod({...newPaymentMethod, accountNumber: e.target.value})}
              />
            </>
          ) : (
            <TextField
              margin="dense"
              label="Phone Number"
              fullWidth
              variant="outlined"
              value={newPaymentMethod.phoneNumber}
              onChange={(e) => setNewPaymentMethod({...newPaymentMethod, phoneNumber: e.target.value})}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentMethodDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddPaymentMethod} variant="contained">
            Add Payment Method
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorWalletDashboard;