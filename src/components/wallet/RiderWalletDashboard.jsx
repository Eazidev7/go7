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
  Divider
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  TrendingUp as EarningsIcon,
  LocalShipping as DeliveryIcon,
  GetApp as WithdrawIcon,
  History as HistoryIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import { 
  getRiderEarnings, 
  getRiderWithdrawals, 
  requestWithdrawal,
  getUserPaymentMethods,
  addPaymentMethod 
} from '../../services/walletService';

const RiderWalletDashboard = ({ riderId, riderName }) => {
  // State management
  const [earnings, setEarnings] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Withdrawal dialog state
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  
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
  }, [riderId]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [earningsData, withdrawalsData, paymentMethodsData] = await Promise.all([
        getRiderEarnings(riderId),
        getRiderWithdrawals(riderId, 10),
        getUserPaymentMethods(riderId)
      ]);

      setEarnings(earningsData);
      setWithdrawals(withdrawalsData);
      setPaymentMethods(paymentMethodsData);

    } catch (error) {
      console.error('Error loading wallet data:', error);
      setError('Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle withdrawal request
  const handleWithdrawalRequest = async () => {
    try {
      setSubmittingWithdrawal(true);
      
      const amount = parseFloat(withdrawalAmount);
      if (!amount || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (!selectedPaymentMethod) {
        throw new Error('Please select a payment method');
      }

      const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
      if (!paymentMethod) {
        throw new Error('Selected payment method not found');
      }

      await requestWithdrawal(riderId, amount, paymentMethod.type, paymentMethod);
      
      // Refresh data
      await loadWalletData();
      
      // Close dialog and reset form
      setWithdrawalDialogOpen(false);
      setWithdrawalAmount('');
      setSelectedPaymentMethod('');
      
      alert('Withdrawal request submitted successfully!');

    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  // Handle adding payment method
  const handleAddPaymentMethod = async () => {
    try {
      await addPaymentMethod(riderId, newPaymentMethod);
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
          <WalletIcon />
        </Avatar>
        <Box>
          <Typography variant="h4" component="h1">
            Rider Wallet
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {riderName || `Rider #${riderId?.substring(0, 8)}`}
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        {/* Available Balance */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <WalletIcon />
                </Avatar>
                <Typography variant="h6">Available Balance</Typography>
              </Box>
              <Typography variant="h4" color="success.main" gutterBottom>
                {formatCurrency(earnings?.availableBalance)}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<WithdrawIcon />}
                onClick={() => setWithdrawalDialogOpen(true)}
                disabled={!earnings?.availableBalance || earnings.availableBalance <= 0}
                fullWidth
              >
                Withdraw
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Earnings */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <EarningsIcon />
                </Avatar>
                <Typography variant="h6">Total Earnings</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {formatCurrency(earnings?.totalEarned)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg per delivery: {formatCurrency(earnings?.averageEarningsPerDelivery)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Completed Deliveries */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <DeliveryIcon />
                </Avatar>
                <Typography variant="h6">Deliveries</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {earnings?.deliveryCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last delivery: {earnings?.lastDeliveryCompleted ? formatDate(earnings.lastDeliveryCompleted) : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Summary */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Financial Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Total Earned</Typography>
              <Typography variant="h6">{formatCurrency(earnings?.totalEarned)}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Total Withdrawn</Typography>
              <Typography variant="h6">{formatCurrency(earnings?.totalWithdrawn)}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Pending Withdrawals</Typography>
              <Typography variant="h6" color="warning.main">
                {formatCurrency(earnings?.pendingWithdrawals)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Available Balance</Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(earnings?.availableBalance)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Withdrawals */}
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recent Withdrawals
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CardIcon />}
              onClick={() => setPaymentMethodDialogOpen(true)}
            >
              Manage Payment Methods
            </Button>
          </Box>

          {withdrawals.length === 0 ? (
            <Alert severity="info">No withdrawal history found.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Processed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>{formatDate(withdrawal.requestedAt)}</TableCell>
                      <TableCell>{formatCurrency(withdrawal.amount)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={withdrawal.paymentMethod || 'Bank'} 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={withdrawal.status} 
                          color={getStatusColor(withdrawal.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(withdrawal.processedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawalDialogOpen} onClose={() => setWithdrawalDialogOpen(false)}>
        <DialogTitle>Request Withdrawal</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Available Balance: {formatCurrency(earnings?.availableBalance)}
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Withdrawal Amount"
            type="number"
            fullWidth
            variant="outlined"
            value={withdrawalAmount}
            onChange={(e) => setWithdrawalAmount(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth variant="outlined">
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              label="Payment Method"
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method.id} value={method.id}>
                  {method.type === 'bank' ? 
                    `${method.bankName} - ${method.accountNumber}` :
                    `Mobile Money - ${method.phoneNumber}`
                  }
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {paymentMethods.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No payment methods found. Please add a payment method first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawalDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleWithdrawalRequest}
            disabled={submittingWithdrawal || paymentMethods.length === 0}
            variant="contained"
          >
            {submittingWithdrawal ? <CircularProgress size={20} /> : 'Request Withdrawal'}
          </Button>
        </DialogActions>
      </Dialog>

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

export default RiderWalletDashboard;