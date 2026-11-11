import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Divider,
  Grid,
  Skeleton,
  Badge,
  Tooltip
} from '@mui/material';
import {
  AccountBalanceWallet,
  Add as AddIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Payment as PaymentIcon,
  TrendingUp,
  TrendingDown,
  Close as CloseIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { useAuthContext } from '../context/AuthContext';
import {
  getCustomerWalletInfo,
  subscribeToWalletBalance,
  subscribeToTransactions,
  createTopUpRequest,
  formatCurrency,
  formatTransactionDate,
  getTransactionStyling,
  validateAmount
} from '../services/customerWalletService';

const CustomerWallet = () => {
  const { user } = useAuthContext();
  const [walletData, setWalletData] = useState({
    balance: 0,
    lastUpdated: null
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Initialize wallet data
  useEffect(() => {
    if (!user?.uid) return;

    const loadWalletData = async () => {
      try {
        setLoading(true);
        const walletInfo = await getCustomerWalletInfo(user.uid);
        setWalletData({
          balance: walletInfo.balance || 0,
          lastUpdated: walletInfo.lastUpdated
        });
        setTransactions(walletInfo.transactions || []);
      } catch (error) {
        console.error('Error loading wallet data:', error);
        setError('Failed to load wallet information');
      } finally {
        setLoading(false);
      }
    };

    loadWalletData();
  }, [user?.uid]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to balance updates
    const unsubscribeBalance = subscribeToWalletBalance(user.uid, (data) => {
      if (data.error) {
        setError(data.error);
      } else {
        setWalletData(data);
      }
    });

    // Subscribe to transaction updates
    const unsubscribeTransactions = subscribeToTransactions(user.uid, (data) => {
      if (data.error) {
        setError(data.error);
      } else {
        setTransactions(data);
      }
    });

    return () => {
      unsubscribeBalance();
      unsubscribeTransactions();
    };
  }, [user?.uid]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    const validation = validateAmount(amount, 100, 500000);
    
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setTopUpLoading(true);
    setError(null);

    try {
      const topUpRequest = await createTopUpRequest(
        user.uid,
        amount,
        user.email,
        user.phoneNumber || ''
      );

      // Initialize Paystack payment
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: amount * 100, // Convert to kobo
        ref: topUpRequest.reference,
        metadata: {
          custom_fields: [
            {
              display_name: "Customer ID",
              variable_name: "customer_id",
              value: user.uid
            }
          ]
        },
        callback: function(response) {
          setSuccess(`Payment successful! Your wallet will be credited shortly.`);
          setTopUpDialogOpen(false);
          setTopUpAmount('');
        },
        onClose: function() {
          setError('Payment was cancelled');
        }
      });

      handler.openIframe();

    } catch (error) {
      setError(error.message);
    } finally {
      setTopUpLoading(false);
    }
  };

  const refreshWallet = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const walletInfo = await getCustomerWalletInfo(user.uid);
      setWalletData({
        balance: walletInfo.balance || 0,
        lastUpdated: walletInfo.lastUpdated
      });
      setTransactions(walletInfo.transactions || []);
      setSuccess('Wallet refreshed successfully');
    } catch (error) {
      setError('Failed to refresh wallet');
    } finally {
      setLoading(false);
    }
  };

  const getBalanceColor = (balance) => {
    if (balance > 1000) return 'success.main';
    if (balance > 100) return 'warning.main';
    return 'error.main';
  };

  const getBalanceStatus = (balance) => {
    if (balance > 1000) return { text: 'Good', color: 'success' };
    if (balance > 100) return { text: 'Low', color: 'warning' };
    return { text: 'Very Low', color: 'error' };
  };

  if (loading && !walletData.balance) {
    return (
      <Box p={3}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={300} />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Success/Error Messages */}
      {success && (
        <Alert 
          severity="success" 
          onClose={() => setSuccess(null)}
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
      )}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Wallet Balance Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" component="div">
                  Wallet Balance
                </Typography>
                <Box display="flex" gap={1}>
                  <Tooltip title="Refresh wallet">
                    <IconButton onClick={refreshWallet} disabled={loading}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                  <Badge 
                    badgeContent={getBalanceStatus(walletData.balance).text}
                    color={getBalanceStatus(walletData.balance).color}
                  >
                    <AccountBalanceWallet color="primary" />
                  </Badge>
                </Box>
              </Box>

              <Typography 
                variant="h3" 
                component="div" 
                sx={{ 
                  color: getBalanceColor(walletData.balance),
                  fontWeight: 'bold',
                  mb: 1
                }}
              >
                {formatCurrency(walletData.balance)}
              </Typography>

              {walletData.lastUpdated && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Last updated: {formatTransactionDate(walletData.lastUpdated)}
                </Typography>
              )}

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setTopUpDialogOpen(true)}
                fullWidth
                size="large"
                sx={{ mt: 2 }}
              >
                Top Up Wallet
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                Transaction Summary
              </Typography>

              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {transactions.filter(t => t.type === 'credit').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Credits
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {transactions.filter(t => t.type === 'debit').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Debits
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {transactions.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                fullWidth
                onClick={refreshWallet}
              >
                View All Transactions
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Transaction History */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                Recent Transactions
              </Typography>

              {transactions.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <PaymentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No transactions yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your wallet transactions will appear here
                  </Typography>
                </Box>
              ) : (
                <List>
                  {transactions.slice(0, 10).map((transaction, index) => {
                    const styling = getTransactionStyling(transaction.type);
                    
                    return (
                      <React.Fragment key={transaction.id}>
                        <ListItem>
                          <ListItemIcon>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: styling.bgColor,
                                color: styling.textColor
                              }}
                            >
                              {transaction.type === 'credit' ? <TrendingUp /> : <TrendingDown />}
                            </Box>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body1">
                                  {transaction.description || 'Transaction'}
                                </Typography>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    color: styling.textColor,
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {styling.prefix}{formatCurrency(transaction.amount)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                  {formatTransactionDate(transaction.createdAt)}
                                </Typography>
                                <Chip 
                                  label={transaction.status || 'completed'} 
                                  size="small"
                                  color={transaction.status === 'completed' ? 'success' : 'default'}
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < transactions.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Up Dialog */}
      <Dialog 
        open={topUpDialogOpen} 
        onClose={() => setTopUpDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Top Up Wallet
            <IconButton onClick={() => setTopUpDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              label="Amount (₦)"
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              fullWidth
              variant="outlined"
              helperText="Minimum: ₦100, Maximum: ₦500,000"
              inputProps={{ min: 100, max: 500000 }}
            />
            
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Quick amounts:
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {[500, 1000, 2000, 5000, 10000].map((amount) => (
                  <Chip
                    key={amount}
                    label={formatCurrency(amount)}
                    onClick={() => setTopUpAmount(amount.toString())}
                    variant={topUpAmount === amount.toString() ? "filled" : "outlined"}
                    color="primary"
                    size="small"
                  />
                ))}
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              You will be redirected to Paystack to complete your payment securely.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopUpDialogOpen(false)}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleTopUp}
            loading={topUpLoading}
            variant="contained"
            disabled={!topUpAmount || parseFloat(topUpAmount) < 100}
          >
            Proceed to Payment
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerWallet;