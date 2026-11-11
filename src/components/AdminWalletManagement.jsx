import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Skeleton,
  Tooltip,
  Badge,
  Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  AccountBalanceWallet,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  TrendingUp,
  TrendingDown,
  Close as CloseIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  adminAdjustWallet,
  getWalletStatistics,
  formatCurrency,
  formatTransactionDate,
  validateAmount,
  subscribeToTransactions
} from '../services/customerWalletService';

const AdminWalletManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [viewTransactionsOpen, setViewTransactionsOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [walletStats, setWalletStats] = useState({});
  
  // Adjustment form state
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('credit');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load customers and their wallet data
  useEffect(() => {
    loadCustomersWithWallets();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.id?.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Calculate wallet statistics
  useEffect(() => {
    const stats = getWalletStatistics(customers);
    setWalletStats(stats);
  }, [customers]);

  const loadCustomersWithWallets = async () => {
    try {
      setLoading(true);
      
      // Get all customers
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customersList = [];

      for (const customerDoc of customersSnapshot.docs) {
        const customerData = customerDoc.data();
        
        // Get wallet data for each customer
        try {
          const walletDoc = await getDoc(doc(db, 'customers', customerDoc.id, 'wallet', 'main'));
          const walletData = walletDoc.exists() ? walletDoc.data() : { balance: 0 };
          
          customersList.push({
            id: customerDoc.id,
            ...customerData,
            balance: walletData.balance || 0,
            lastUpdated: walletData.lastUpdated?.toDate()
          });
        } catch (error) {
          console.error(`Error loading wallet for customer ${customerDoc.id}:`, error);
          customersList.push({
            id: customerDoc.id,
            ...customerData,
            balance: 0,
            lastUpdated: null
          });
        }
      }

      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
      setError('Failed to load customer wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustWallet = async () => {
    const amount = parseFloat(adjustmentAmount);
    const validation = validateAmount(amount, 1, 1000000);
    
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    if (!adjustmentReason.trim()) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    setAdjustmentLoading(true);
    setError(null);

    try {
      await adminAdjustWallet(
        selectedCustomer.id,
        amount,
        adjustmentType,
        adjustmentReason.trim(),
        adminNote.trim()
      );

      setSuccess(`Wallet ${adjustmentType} of ${formatCurrency(amount)} completed successfully`);
      setAdjustmentDialogOpen(false);
      resetAdjustmentForm();
      loadCustomersWithWallets(); // Refresh data

    } catch (error) {
      setError(error.message);
    } finally {
      setAdjustmentLoading(false);
    }
  };

  const resetAdjustmentForm = () => {
    setAdjustmentAmount('');
    setAdjustmentType('credit');
    setAdjustmentReason('');
    setAdminNote('');
    setSelectedCustomer(null);
  };

  const openAdjustmentDialog = (customer) => {
    setSelectedCustomer(customer);
    setAdjustmentDialogOpen(true);
  };

  const openTransactionsDialog = async (customer) => {
    setSelectedCustomer(customer);
    setViewTransactionsOpen(true);
    
    // Load customer transactions
    try {
      const transactionsQuery = query(
        collection(db, 'customers', customer.id, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsList = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      
      setTransactions(transactionsList);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load customer transactions');
    }
  };

  const getBalanceStatusColor = (balance) => {
    if (balance > 1000) return 'success';
    if (balance > 100) return 'warning';
    return 'error';
  };

  const adjustmentReasons = [
    'Refund for cancelled delivery',
    'Promotional credit',
    'Customer complaint resolution',
    'System error correction',
    'Manual adjustment',
    'Bonus reward',
    'Other'
  ];

  if (loading) {
    return (
      <Box p={3}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Wallet Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Customers
                  </Typography>
                  <Typography variant="h4">
                    {walletStats.totalCustomers || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <AccountBalanceWallet />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Balance
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(walletStats.totalBalance || 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Wallets
                  </Typography>
                  <Typography variant="h4">
                    {walletStats.activeWallets || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Average Balance
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(walletStats.averageBalance || 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <AccountBalanceWallet />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
            <TextField
              label="Search customers"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone, or ID"
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ flex: 1, maxWidth: 400 }}
            />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadCustomersWithWallets}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Customer Wallets ({filteredCustomers.length})
          </Typography>

          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Last Updated</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body1" color="text.secondary">
                        No customers found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {customer.name || 'Unknown'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ID: {customer.id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {customer.email || 'No email'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {customer.phone || 'No phone'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight="bold">
                          {formatCurrency(customer.balance)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={customer.balance > 100 ? 'Active' : 'Low'}
                          color={getBalanceStatusColor(customer.balance)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {customer.lastUpdated 
                            ? formatTransactionDate(customer.lastUpdated)
                            : 'Never'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Tooltip title="View Transactions">
                            <IconButton
                              size="small"
                              onClick={() => openTransactionsDialog(customer)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Adjust Wallet">
                            <IconButton
                              size="small"
                              onClick={() => openAdjustmentDialog(customer)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Wallet Adjustment Dialog */}
      <Dialog 
        open={adjustmentDialogOpen} 
        onClose={() => setAdjustmentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Adjust Wallet Balance
            <IconButton onClick={() => setAdjustmentDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box mt={2}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Customer:</strong> {selectedCustomer.name || 'Unknown'}<br />
                  <strong>Current Balance:</strong> {formatCurrency(selectedCustomer.balance)}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value)}
                      label="Type"
                    >
                      <MenuItem value="credit">Credit (Add)</MenuItem>
                      <MenuItem value="debit">Debit (Subtract)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Amount (₦)"
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    fullWidth
                    variant="outlined"
                    inputProps={{ min: 1, max: 1000000 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Reason</InputLabel>
                    <Select
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      label="Reason"
                    >
                      {adjustmentReasons.map((reason) => (
                        <MenuItem key={reason} value={reason}>
                          {reason}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Admin Note (Optional)"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                    placeholder="Additional notes for this adjustment"
                  />
                </Grid>
              </Grid>

              {adjustmentType === 'debit' && selectedCustomer.balance < parseFloat(adjustmentAmount || 0) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Warning: This debit amount exceeds the customer's current balance.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialogOpen(false)}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleAdjustWallet}
            loading={adjustmentLoading}
            variant="contained"
            disabled={!adjustmentAmount || !adjustmentReason}
          >
            Apply Adjustment
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* View Transactions Dialog */}
      <Dialog 
        open={viewTransactionsOpen} 
        onClose={() => setViewTransactionsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Transaction History
            <IconButton onClick={() => setViewTransactionsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Customer:</strong> {selectedCustomer.name || 'Unknown'}<br />
                  <strong>Current Balance:</strong> {formatCurrency(selectedCustomer.balance)}
                </Typography>
              </Alert>

              {transactions.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    No transactions found
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {formatTransactionDate(transaction.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={transaction.type}
                              color={transaction.type === 'credit' ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              color={transaction.type === 'credit' ? 'success.main' : 'error.main'}
                              fontWeight="medium"
                            >
                              {transaction.type === 'credit' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {transaction.description || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={transaction.status || 'completed'}
                              color={transaction.status === 'completed' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewTransactionsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminWalletManagement;