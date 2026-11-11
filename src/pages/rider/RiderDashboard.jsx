import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  setRiderOnline, 
  getAvailableJobs, 
  getCurrentJob,
  getRiderEarnings,
  acceptJob,
  clearRiderStaleJobs,
  startRiderLocationLoop,
  stopRiderLocationLoop,
} from '../../services/riderService';
import { getRiderApplication, subscribeRiderApplication } from '../../services/riderAuthService';
import { isRiderApproved } from '../../utils/riderApproval';
import {
  formatJobItemsSummary,
  getJobTypeLabel,
  getPickupLabel,
  getDropoffLabel,
} from '../../utils/riderJobUtils';
import { 
  Power, 
  TrendingUp, 
  MapPin, 
  Clock, 
  Package,
  DollarSign,
  Navigation
} from 'lucide-react';
import Swal from 'sweetalert2';

const RiderDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [earnings, setEarnings] = useState({ today: 0, total: 0, completedDeliveries: 0 });
  const [loading, setLoading] = useState(true);
  const [riderProfile, setRiderProfile] = useState(null);

  const riderId = currentUser?.uid;

  useEffect(() => {
    if (!riderId) {
      navigate('/rider/login');
      return;
    }
    loadDashboardData();

    const unsub = subscribeRiderApplication(riderId, (profile) => {
      if (profile) setRiderProfile(profile);
    });

    return () => unsub();
  }, [riderId]);

  // Publish GPS for active job even before rider opens the job screen
  useEffect(() => {
    if (!riderId || !currentJob?.id) return undefined;
    const cleanup = startRiderLocationLoop(riderId, currentJob.id);
    return () => {
      if (typeof cleanup === 'function') cleanup();
      stopRiderLocationLoop();
    };
  }, [riderId, currentJob?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await clearRiderStaleJobs(riderId);

      const [earningsData, job, profile] = await Promise.all([
        getRiderEarnings(riderId),
        getCurrentJob(riderId),
        getRiderApplication(riderId),
      ]);
      
      setRiderProfile(profile);
      setEarnings(earningsData);
      setCurrentJob(job);
      
      const riderOnline =
        profile?.isAvailable === true ||
        profile?.status === 'available' ||
        profile?.isOnline === true;

      if (job) {
        setIsOnline(true);
      } else {
        setIsOnline(riderOnline);
        await loadAvailableJobs();
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableJobs = async () => {
    try {
      const jobs = await getAvailableJobs(riderId);
      setAvailableJobs(jobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleToggleOnline = async () => {
    try {
      if (!isRiderApproved(riderProfile)) {
        Swal.fire({
          icon: 'info',
          title: 'Application Pending',
          text: 'Your rider application must be approved before you can go online.',
          confirmButtonColor: '#E30613',
        });
        return;
      }

      const newStatus = !isOnline;
      await setRiderOnline(riderId, newStatus);
      setIsOnline(newStatus);

      if (newStatus) {
        await loadAvailableJobs();
        Swal.fire({
          icon: 'success',
          title: 'You\'re Online!',
          text: 'You can now receive delivery requests',
          background: '#fff',
          confirmButtonColor: '#E30613',
          timer: 2000
        });
      } else {
        setAvailableJobs([]);
        Swal.fire({
          icon: 'info',
          title: 'You\'re Offline',
          text: 'You won\'t receive new delivery requests',
          background: '#fff',
          confirmButtonColor: '#E30613',
          timer: 2000
        });
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update status. Please try again.',
        confirmButtonColor: '#E30613'
      });
    }
  };

  const handleAcceptJob = async (orderId) => {
    try {
      const result = await Swal.fire({
        title: 'Accept Delivery?',
        text: 'You will be assigned to this delivery',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#E30613',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Accept',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await acceptJob(riderId, orderId);
        
        Swal.fire({
          icon: 'success',
          title: 'Job Accepted!',
          text: 'Redirecting to job details...',
          background: '#fff',
          confirmButtonColor: '#E30613',
          timer: 1500,
          showConfirmButton: false
        });

        setTimeout(() => {
          navigate(`/rider/job/${orderId}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error accepting job:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to accept job. Please try again.',
        confirmButtonColor: '#E30613'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (currentJob) {
    navigate(`/rider/job/${currentJob.id}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Rider Dashboard</h1>
          <p className="text-red-100">
            Welcome, {riderProfile?.name || currentUser?.displayName || 'Rider'}
            {isRiderApproved(riderProfile) ? '' : ' — awaiting approval'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Online/Offline Toggle */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Power className={`w-6 h-6 ${isOnline ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isOnline ? 'Online' : 'Offline'}
                </h2>
                <p className="text-sm text-gray-500">
                  {isOnline ? 'Receiving delivery requests' : 'Not receiving requests'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleOnline}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                isOnline
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>

        {/* Earnings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Today's Earnings</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₦{earnings.today.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total Earnings</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₦{earnings.total.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Deliveries</span>
              <Package className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{earnings.completedDeliveries}</p>
          </div>
        </div>

        {/* Available Jobs */}
        {isOnline && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Available Deliveries</h2>
            
            {availableJobs.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No deliveries available right now</p>
                <p className="text-gray-400 text-sm mt-2">New requests will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableJobs.map((job) => (
                  <div
                    key={job.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-red-500 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Package className="w-5 h-5 text-red-600" />
                          <span className="font-semibold text-gray-900">
                            {getJobTypeLabel(job)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{job.bookingId || job.id}</p>
                        {job.vendorName ? (
                          <p className="text-xs text-gray-500 mt-0.5">{job.vendorName}</p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">₦{job.deliveryFee}</p>
                        <p className="text-xs text-gray-500">Delivery Fee</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Pickup</p>
                          <p className="text-sm font-medium text-gray-900">
                            {getPickupLabel(job)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Navigation className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Dropoff</p>
                          <p className="text-sm font-medium text-gray-900">
                            {getDropoffLabel(job)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <p className="text-sm text-gray-600">
                          {job.distance ? `${job.distance.toFixed(1)} km` : 'Distance unknown'}
                        </p>
                      </div>

                      {formatJobItemsSummary(job) ? (
                        <div className="flex items-start space-x-3 rounded-lg bg-amber-50 px-3 py-2">
                          <Package className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-amber-800 mb-0.5 font-medium">Contents to pick</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatJobItemsSummary(job)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
                    >
                      Accept Delivery
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            onClick={() => navigate('/rider/earnings')}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">View Earnings</p>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <Package className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">My Profile</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiderDashboard;
