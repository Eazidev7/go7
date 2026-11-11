/**
 * Rider application — submit profile and documents for admin review.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Bike, Upload, CheckCircle, Loader, ArrowLeft, FileText, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitRiderApplication, subscribeRiderApplication } from '../../services/riderAuthService';
import { isRiderApproved, isRiderPendingReview } from '../../utils/riderApproval';
import { FLEET_OPTIONS, fleetSelectValue } from '../../utils/riderFleetLabels';

const FileField = ({ label, hint, name, file, preview, onChange, required }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-600">*</span>}
    </label>
    {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-colors">
      {preview ? (
        <img src={preview} alt="" className="h-full w-full object-cover rounded-xl" />
      ) : (
        <div className="text-center p-4">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <span className="text-sm text-gray-500">Tap to upload (JPG, PNG — max 5MB)</span>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(name, e.target.files?.[0] || null)}
      />
    </label>
    {file && <p className="text-xs text-green-600 mt-1">✓ {file.name}</p>}
  </div>
);

const RiderRegister = () => {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existing, setExisting] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    fleetType: 'bike',
    plateNumber: '',
    licenseNumber: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  const [files, setFiles] = useState({
    profilePhoto: null,
    idDocument: null,
    licensePhoto: null,
    vehiclePhoto: null,
  });

  const [previews, setPreviews] = useState({});

  useEffect(() => {
    const auth = getAuth();
    let profileUnsub = () => {};

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      profileUnsub();
      setUser(u);
      setAuthReady(true);
      if (!u) return;

      profileUnsub = subscribeRiderApplication(u.uid, (app) => {
        if (!app) return;
        setExisting(app);
        if (isRiderApproved(app)) {
          navigate('/rider/dashboard', { replace: true });
          return;
        }
        setForm((prev) => ({
          ...prev,
          name: app.name || app.fullName || prev.name,
          email: app.email || u.email || prev.email,
          phone: app.phone || prev.phone,
          address: app.address || prev.address,
          fleetType: fleetSelectValue(app),
          plateNumber: app.plateNumber || '',
          licenseNumber: app.licenseNumber || app.driversLicense || '',
          bankName: app.bankName || '',
          accountNumber: app.accountNumber || '',
          accountName: app.accountName || '',
        }));
        if (isRiderPendingReview(app) && !app.reuploadEnabled) {
          setSubmitted(true);
        } else if (isRiderApproved(app)) {
          setSubmitted(false);
        }
      });
    });

    return () => {
      unsubAuth();
      profileUnsub();
    };
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (name, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }
    setFiles((prev) => ({ ...prev, [name]: file }));
    const reader = new FileReader();
    reader.onload = () => setPreviews((prev) => ({ ...prev, [name]: reader.result }));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!form.name.trim()) { toast.error('Full name is required'); return false; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { toast.error('Valid email is required'); return false; }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) { toast.error('Valid phone number is required'); return false; }
    if (!form.address.trim()) { toast.error('Address is required'); return false; }
    if (!files.idDocument && !existing?.idDocumentURL) { toast.error('ID document photo is required'); return false; }
    if (!files.profilePhoto && !existing?.profilePhoto && !existing?.photoURL) { toast.error('Profile photo is required'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in first');
      navigate('/rider/login');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await submitRiderApplication(user.uid, form, files);
      setSubmitted(true);
      toast.success(existing ? 'Application updated successfully!' : 'Application submitted!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-10 h-10 text-red-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Bike className="w-14 h-14 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Rider Application</h1>
          <p className="text-gray-600 text-sm mb-6">Log in with the same phone number you used when you first registered.</p>
          <Link to="/rider/login" className="block w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">
            Log In to Continue
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Under Review</h1>
          <p className="text-gray-600 text-sm mb-4">
            Thank you, <strong>{form.name}</strong>. Our team will review your documents within 24–48 hours.
            You will receive an email at <strong>{form.email}</strong> once approved.
          </p>
          <p className="text-xs text-gray-400 mb-6">Need to update your documents? Use the button below.</p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="w-full py-3 mb-3 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200"
          >
            Update / Re-upload Documents
          </button>
          <Link to="/" className="text-sm text-red-600 hover:underline">Back to Go7 Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-red-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Go7
        </Link>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-8 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Go7 Rider Application</h1>
                <p className="text-red-100 text-sm mt-1">
                  {existing ? 'Update your details and re-upload documents' : 'Complete your profile to start delivering'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {existing?.reuploadEnabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Your account has been cleared for re-upload. Please submit your documents again below.
              </div>
            )}

            <section>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Personal Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} required placeholder="09012345678"
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Address *</label>
                  <input name="address" value={form.address} onChange={handleChange} required
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Vehicle</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fleet Type *</label>
                  <select name="fleetType" value={form.fleetType} onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none">
                    {FLEET_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
                  <input name="plateNumber" value={form.plateNumber} onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input name="licenseNumber" value={form.licenseNumber} onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" /> Documents
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FileField label="Profile Photo" name="profilePhoto" file={files.profilePhoto}
                  preview={previews.profilePhoto || existing?.profilePhoto || existing?.photoURL}
                  onChange={handleFile} required />
                <FileField label="Government ID" hint="NIN, Voter's card, or Driver's license" name="idDocument"
                  file={files.idDocument} preview={previews.idDocument || existing?.idDocumentURL}
                  onChange={handleFile} required />
                <FileField label="Driver's License Photo" name="licensePhoto" file={files.licensePhoto}
                  preview={previews.licensePhoto || existing?.licensePhotoURL} onChange={handleFile} />
                <FileField label="Vehicle Photo" name="vehiclePhoto" file={files.vehiclePhoto}
                  preview={previews.vehiclePhoto || existing?.vehiclePhotoURL} onChange={handleFile} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Bank Details (for payouts)
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input name="bankName" value={form.bankName} onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input name="accountNumber" value={form.accountNumber} onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input name="accountName" value={form.accountName} onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
              </div>
            </section>

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader className="w-5 h-5 animate-spin" /> Submitting...</> : 'Submit Application for Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RiderRegister;
