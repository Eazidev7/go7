/**
 * GO7 Agent Signup - Phone OTP & Identity Verification
 * Multi-step registration with WhatsApp OTP and ID verification
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createAgent } from '../services/agentEarningsService';
import { sendOTP } from '../services/otpService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  User, Smartphone, Shield, Building, Upload, 
  ArrowLeft, ArrowRight, TrendingUp, Loader, CheckCircle, IdCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AgentSignup.css';

const verifyPhoneOTP = httpsCallable(getFunctions(), 'verifyPhoneOTP');

const AgentSignup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Basic, 2: OTP, 3: Bank, 4: Identity
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [idFilePreview, setIdFilePreview] = useState('');
  
  // OTP management
  const [sentOTP, setSentOTP] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [userId, setUserId] = useState('');

  // Format phone number
  const formatPhoneNumber = (phoneStr) => {
    let cleaned = phoneStr.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.slice(1);
    } else if (cleaned.startsWith('234')) {
      // Already formatted
    } else {
      cleaned = '234' + cleaned;
    }
    return cleaned;
  };

  // Step 1: Submit phone and name
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    
    if (!phone.trim() || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const tempUserId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setUserId(tempUserId);

      // Send OTP via WhatsApp
      await sendOTP(tempUserId, formattedPhone, 'Agent Registration');
      
      setSentOTP(true);
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000); // 10 minutes
      setStep(2);
      toast.success('OTP sent to your WhatsApp!');
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP via Cloud Function (Admin SDK — no Firebase Auth yet)
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    
    if (loading) return;

    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const verifyResult = await verifyPhoneOTP({
        userId,
        phoneNumber: formatPhoneNumber(phone),
        code: String(otp).trim(),
      });
      
      if (verifyResult.data?.success) {
        toast.success('Phone verified! ✓');
        setStep(3);
      } else {
        toast.error('Invalid or expired OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      let message = 'Failed to verify OTP';
      if (error.code === 'functions/not-found') {
        message = 'No OTP found. Please request a new code.';
      } else if (error.code === 'functions/deadline-exceeded') {
        message = 'OTP has expired. Please request a new code.';
      } else if (error.code === 'functions/permission-denied') {
        message = error.message || 'Invalid OTP code.';
      } else if (error.message) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      await sendOTP(userId, formattedPhone, 'Agent Registration');
      
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      toast.success('New OTP sent!');
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Bank details
  const handleBankSubmit = (e) => {
    e.preventDefault();
    
    if (!bankName || !accountNumber) {
      toast.error('Please fill in all bank details');
      return;
    }

    if (accountNumber.length !== 10) {
      toast.error('Account number must be 10 digits');
      return;
    }

    setStep(4);
  };

  // Handle ID file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setIdFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 4: Complete registration with identity verification
  const handleFinalSubmit = async (e) => {
    e.preventDefault();

    if (!idType || !idNumber || !idFile) {
      toast.error('Please complete all identity verification fields');
      return;
    }

    setLoading(true);

    try {
      // Generate random email for Firebase Auth (since we're using phone)
      const randomEmail = `agent_${userId}@go7agents.internal`;
      const randomPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);

      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        randomEmail,
        randomPassword
      );
      const firebaseUser = userCredential.user;

      // Step 2: Upload ID document to Firebase Storage
      const storageRef = ref(storage, `agent-ids/${firebaseUser.uid}/${idFile.name}`);
      await uploadBytes(storageRef, idFile);
      const idFileURL = await getDownloadURL(storageRef);

      // Step 3: Create agent profile in Firestore
      const agentData = {
        uid: firebaseUser.uid,
        name: name.trim(),
        phone: formatPhoneNumber(phone),
        bankName,
        accountNumber,
        accountName: accountName.trim() || name.trim(),
        identityVerification: {
          idType,
          idNumber,
          idFileURL,
          verified: false, // Admin will verify
          submittedAt: new Date().toISOString()
        }
      };

      const result = await createAgent(agentData);

      // Success!
      localStorage.setItem('agentId', result.agentId);
      localStorage.setItem('agentName', name);
      localStorage.setItem('agentPhone', phone);

      toast.success('Account created successfully! Welcome to Go7 Agents 🎉');
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate(`/agent/${result.agentId}`);
      }, 1500);

    } catch (error) {
      console.error('Final signup error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This account is already registered. Please login instead.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      // Cleanup if auth succeeded but profile creation failed
      if (auth.currentUser) {
        await auth.currentUser.delete().catch(console.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="go7-agent-signup">
      <div className="signup-wrapper">
        <div className="signup-content">
          {/* Header */}
          <div className="signup-header">
            <Link to="/agent/login" className="back-button">
              <ArrowLeft size={20} />
            </Link>
            <div className="logo">
              <TrendingUp size={28} color="#D72638" />
              <span className="go7-text">Go7</span>
              <span className="agent-tag">Agents</span>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="progress-steps">
            <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-circle">
                {step > 1 ? <CheckCircle size={20} /> : <User size={20} />}
              </div>
              <span>Basic</span>
            </div>
            <div className="step-line"></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="step-circle">
                {step > 2 ? <CheckCircle size={20} /> : <Shield size={20} />}
              </div>
              <span>Verify</span>
            </div>
            <div className="step-line"></div>
            <div className={`progress-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
              <div className="step-circle">
                {step > 3 ? <CheckCircle size={20} /> : <Building size={20} />}
              </div>
              <span>Bank</span>
            </div>
            <div className="step-line"></div>
            <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>
              <div className="step-circle">
                <IdCard size={20} />
              </div>
              <span>ID</span>
            </div>
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="signup-step">
              <h1>Become a Go7 Agent</h1>
              <p className="subtitle">Start earning by onboarding vendors</p>

              <form onSubmit={handleStep1Submit} className="signup-form">
                <div className="form-group">
                  <label>
                    <User size={18} />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Smartphone size={18} />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                    required
                  />
                  <span className="hint">WhatsApp number for OTP verification</span>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader size={20} className="spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>

              {/* Earnings Preview */}
              <div className="earnings-preview">
                <h3>Earn with Go7</h3>
                <div className="earnings-grid">
                  <div className="earning-card">
                    <div className="amount">₦3,000</div>
                    <div className="label">Vendor Goes Live</div>
                  </div>
                  <div className="earning-card">
                    <div className="amount">₦1,500</div>
                    <div className="label">First Order</div>
                  </div>
                </div>
                <p className="withdrawal-note">
                  Withdraw anytime with minimum of <strong>₦5,000</strong>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <div className="signup-step">
              <div className="otp-icon">
                <Shield size={64} color="#D72638" />
              </div>
              
              <h1>Verify Your Phone</h1>
              <p className="subtitle">
                Enter the 6-digit code sent to<br />
                <strong>{phone}</strong>
              </p>

              <form onSubmit={handleOTPSubmit} className="otp-form">
                <div className="form-group">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength="6"
                    className="otp-input"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader size={20} className="spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify OTP
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                <div className="otp-actions">
                  <button
                    type="button"
                    className="link-button"
                    onClick={handleResendOTP}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setStep(1)}
                  >
                    Change Phone Number
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Bank Details */}
          {step === 3 && (
            <div className="signup-step">
              <h1>Bank Account</h1>
              <p className="subtitle">Your earnings will be paid to this account</p>

              <form onSubmit={handleBankSubmit} className="signup-form">
                <div className="form-group">
                  <label>
                    <Building size={18} />
                    Bank Name
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                  >
                    <option value="">Select your bank</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="GTBank">GTBank</option>
                    <option value="First Bank">First Bank</option>
                    <option value="UBA">UBA</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                    <option value="Fidelity Bank">Fidelity Bank</option>
                    <option value="Union Bank">Union Bank</option>
                    <option value="Stanbic IBTC">Stanbic IBTC</option>
                    <option value="Sterling Bank">Sterling Bank</option>
                    <option value="Wema Bank">Wema Bank</option>
                    <option value="Polaris Bank">Polaris Bank</option>
                    <option value="Ecobank">Ecobank</option>
                    <option value="FCMB">FCMB</option>
                    <option value="Kuda Bank">Kuda Bank</option>
                    <option value="OPay">OPay</option>
                    <option value="PalmPay">PalmPay</option>
                    <option value="Moniepoint">Moniepoint</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="0123456789"
                    maxLength="10"
                    required
                  />
                  <span className="hint">10-digit account number</span>
                </div>

                <div className="form-group">
                  <label>Account Name (Optional)</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Leave blank to use your name"
                  />
                </div>

                <div className="button-group">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft size={20} />
                    Back
                  </button>
                  <button type="submit" className="btn-primary">
                    Continue
                    <ArrowRight size={20} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 4: Identity Verification */}
          {step === 4 && (
            <div className="signup-step">
              <h1>Identity Verification</h1>
              <p className="subtitle">Upload a valid ID for account verification</p>

              <form onSubmit={handleFinalSubmit} className="signup-form">
                <div className="form-group">
                  <label>
                    <IdCard size={18} />
                    ID Type
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    required
                  >
                    <option value="">Select ID type</option>
                    <option value="NIN">National ID (NIN)</option>
                    <option value="Drivers License">Driver's License</option>
                    <option value="Voters Card">Voter's Card</option>
                    <option value="International Passport">International Passport</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ID Number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Enter your ID number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Upload size={18} />
                    Upload ID Document
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    required
                    className="file-input"
                  />
                  <span className="hint">JPG, PNG or PDF (Max 5MB)</span>
                  
                  {idFilePreview && (
                    <div className="file-preview">
                      <img src={idFilePreview} alt="ID Preview" />
                    </div>
                  )}
                </div>

                <div className="verification-note">
                  <Shield size={18} color="#10b981" />
                  <p>Your ID will be reviewed by our team within 24 hours</p>
                </div>

                <div className="button-group">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setStep(3)}
                  >
                    <ArrowLeft size={20} />
                    Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader size={20} className="spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Complete Registration
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="signup-footer">
            <p>
              Already have an account?{' '}
              <Link to="/agent/login">Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSignup;
