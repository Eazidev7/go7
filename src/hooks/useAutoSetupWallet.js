import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ensureVirtualAccount } from '../firebase/services/paystackDVAService';
import toast from 'react-hot-toast';

/**
 * 🔐 Auto-setup Virtual Account Hook
 * 
 * Automatically creates a Paystack virtual account for new users
 * Call this hook in your main App or after successful signup
 */
export const useAutoSetupWallet = (user) => {
  console.log('🔐 useAutoSetupWallet hook called - Version: October 31, 2025 - 3:45 PM');
  console.log('👤 User passed to hook:', user?.uid, user?.email);
  
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [hasVirtualAccount, setHasVirtualAccount] = useState(false);
  const [setupError, setSetupError] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setHasVirtualAccount(false);
      return;
    }

    const checkAndSetupWallet = async () => {
      try {
        // Check if user already has a virtual account
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};

        if (userData.virtualAccount) {
          console.log('✅ User already has virtual account');
          setHasVirtualAccount(true);
          return;
        }

        // User doesn't have virtual account - create one
        console.log('🏗️ Setting up virtual account for new user...');
        setIsSettingUp(true);

        const result = await ensureVirtualAccount({ uid: user.uid });

        if (result) {
          console.log('✅ Virtual account created successfully:', result);
          setHasVirtualAccount(true);
          toast.success('Your wallet is ready! You can now fund it via bank transfer.');
        } else {
          console.log('ℹ️ Virtual account not ready yet — add phone number to your profile');
        }

      } catch (error) {
        console.error('❌ Wallet setup error:', error);
        setSetupError(error.message);
        
        // Don't show error toast for first-time setup failures
        // They can create it manually from the wallet page
        console.warn('⚠️ User can create virtual account manually from wallet page');
      } finally {
        setIsSettingUp(false);
      }
    };

    checkAndSetupWallet();
  }, [user?.uid]);

  return {
    isSettingUp,
    hasVirtualAccount,
    setupError
  };
};

export default useAutoSetupWallet;