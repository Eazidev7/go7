import { auth, db, storage } from '../firebase/config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Swal from 'sweetalert2';
import { createReferralRecord, findUserByReferralCode } from './firestoreProfile.js';

function generateReferralCode(userId) {
  return `GO7-${String(userId).substring(0, 6).toUpperCase()}`;
}

function watchAuthState(callback) {
  try {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        callback(null);
        return;
      }
      // Fetch additional profile data from Firestore users collection
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const firestoreData = userDoc.exists() ? userDoc.data() : {};
        const profile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || firestoreData.name || null,
          phone: firestoreData.phone || user.phoneNumber || null,
          photoURL: user.photoURL || firestoreData.photoURL || null,
          referralCode: firestoreData.referralCode || generateReferralCode(user.uid),
        };
        callback(profile);
      } catch (error) {
        console.error('watchAuthState fetch profile error', error);
        callback({ uid: user.uid, email: user.email });
      }
    });
  } catch (error) {
    console.error('watchAuthState error', error);
    return () => {};
  }
}

async function signUpWithEmail({ email, password, name, referralCode = null, phone = null }) {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);

    const uid = res.user.uid;
    const code = generateReferralCode(uid);

    // Save user record in Firestore
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      name,
      phone,
      referralCode: code,
      createdAt: new Date().toISOString(),
    });

    // If signed up with a referral code, process rewards
    if (referralCode) {
      // find inviter
      const inviter = await findUserByReferralCode(referralCode);
      if (inviter) {
        await createReferralRecord({ inviterId: inviter.id, inviteeId: uid, code: referralCode });
      }
    }

    return { uid, email, name, referralCode: code };
  } catch (error) {
    console.error('signUpWithEmail error', error);
    Swal.fire('Error', error.message || 'Unable to sign up', 'error');
    throw error;
  }
}

async function signInWithEmail({ email, password }) {
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  } catch (error) {
    console.error('signInWithEmail error', error);
    Swal.fire('Error', error.message || 'Unable to sign in', 'error');
    throw error;
  }
}

async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const user = res.user;
    // Ensure Firestore user exists
    const uDoc = await getDoc(doc(db, 'users', user.uid));
    if (!uDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || null,
        photoURL: user.photoURL || null,
        referralCode: generateReferralCode(user.uid),
        createdAt: new Date().toISOString(),
      });
    }
    return user;
  } catch (error) {
    console.error('signInWithGoogle error', error);
    Swal.fire('Error', 'Google sign-in failed', 'error');
    throw error;
  }
}

const PASSWORD_RESET_ACTION = {
  url: 'https://go7.ng/reset-password',
  handleCodeInApp: false,
};

async function sendResetEmail(email) {
  try {
    await sendPasswordResetEmail(auth, email, PASSWORD_RESET_ACTION);
    Swal.fire('Sent', 'Password reset email sent', 'success');
    return true;
  } catch (error) {
    console.error('sendResetEmail error', error);
    Swal.fire('Error', 'Could not send reset email', 'error');
    throw error;
  }
}

async function updateProfilePhoto(userId, file) {
  try {
    if (!storage) throw new Error('Storage not initialized');
    const sRef = storageRef(storage, `users/${userId}/profile.jpg`);
    const snapshot = await uploadBytes(sRef, file);
    const url = await getDownloadURL(sRef);
    // update firebase auth profile and firestore
    await updateProfile(auth.currentUser, { photoURL: url });
    await setDoc(doc(db, 'users', userId), { photoURL: url }, { merge: true });
    return url;
  } catch (error) {
    console.error('updateProfilePhoto error', error);
    Swal.fire('Error', 'Could not upload photo', 'error');
    throw error;
  }
}

export {
  watchAuthState,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  sendResetEmail,
  updateProfilePhoto,
  generateReferralCode,
  PASSWORD_RESET_ACTION,
};
