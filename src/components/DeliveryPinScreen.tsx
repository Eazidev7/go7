import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Copy, Check, RefreshCw, QrCode, Eye, EyeOff, Lock, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getVerificationCode } from '../services/deliveryVerification';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface DeliveryPinScreenProps {
  orderId: string;
  orderNumber?: string;
  riderName?: string;
  riderImage?: string;
  estimatedTime?: number; // minutes
  onClose: () => void;
}

export function DeliveryPinScreen({
  orderId,
  orderNumber = 'GO7-XXXX',
  riderName = 'Your Rider',
  riderImage = '',
  estimatedTime = 5,
  onClose,
}: DeliveryPinScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [pinHidden, setPinHidden] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(estimatedTime);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);

  // Fetch verification code
  useEffect(() => {
    const fetchPin = async () => {
      try {
        setLoading(true);
        const response = await getVerificationCode(orderId);
        if (response.success) {
          setPin(response.data.code);
          if (response.data.expiresAt) {
            setExpiryTime(new Date(response.data.expiresAt));
          }
        }
      } catch (error) {
        console.error('Failed to fetch PIN:', error);
        toast.error('Failed to load delivery PIN');
      } finally {
        setLoading(false);
      }
    };

    fetchPin();
  }, [orderId]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 0.0166)); // Decrease every second
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Copy PIN to clipboard
  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      toast.success('PIN copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy PIN');
    }
  };

  // Format PIN with spaces (e.g., "1234" -> "1 2 3 4")
  const formattedPin = pin.split('').join(' ');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#E53935] to-[#c62828] px-4 py-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="text-white text-center flex-1">
            <div className="text-xs opacity-90">Order {orderNumber}</div>
          </div>

          <button
            onClick={() => setShowQR(!showQR)}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <QrCode className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Rider Info */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-3">
          {riderImage ? (
            <ImageWithFallback
              src={riderImage}
              alt={riderName}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/50"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/25 text-white flex items-center justify-center font-bold border-2 border-white/50">
              {(riderName || 'R').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 text-white">
            <div className="font-semibold">{riderName}</div>
            <div className="text-xs opacity-90">
              Arriving in ~{Math.ceil(timeRemaining)} min
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
            <motion.div
              className="w-3 h-3 bg-white rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-[#E53935]" />
          <span className="text-sm text-gray-600">Secure Delivery Verification</span>
        </div>

        {/* PIN Display */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <RefreshCw className="w-12 h-12 text-[#E53935]" />
              </motion.div>
              <p className="text-gray-500 mt-4">Generating your PIN...</p>
            </motion.div>
          ) : showQR ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              {/* QR Code Placeholder */}
              <div className="bg-white border-8 border-gray-200 rounded-3xl p-8 inline-block shadow-xl">
                <div className="w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-500 mt-6 text-sm">
                Rider can scan this QR code to verify
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="pin"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              {/* PIN Card */}
              <div className="bg-gradient-to-br from-[#E53935] via-[#d32f2f] to-[#c62828] rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <motion.div
                    className="absolute w-64 h-64 bg-white rounded-full -top-32 -right-32"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.div
                    className="absolute w-48 h-48 bg-white rounded-full -bottom-24 -left-24"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.1, 0.15, 0.1],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                  />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-white/80" />
                    <span className="text-white/80 text-sm font-medium">
                      Your Delivery PIN
                    </span>
                  </div>

                  {/* PIN Display */}
                  <div className="bg-white/15 backdrop-blur-sm rounded-2xl py-8 px-6 mb-4 relative">
                    {pinHidden ? (
                      <div className="text-8xl font-bold text-white text-center tracking-[0.3em] font-mono">
                        ••••
                      </div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-8xl font-bold text-white text-center tracking-[0.3em] font-mono"
                      >
                        {formattedPin}
                      </motion.div>
                    )}

                    {/* Toggle visibility button */}
                    <button
                      onClick={() => setPinHidden(!pinHidden)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      {pinHidden ? (
                        <Eye className="w-4 h-4 text-white" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Expiry info */}
                  {expiryTime && (
                    <div className="flex items-center justify-center gap-2 text-white/70 text-xs">
                      <Clock className="w-4 h-4" />
                      <span>Expires at {expiryTime.toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Copy Button */}
              <motion.button
                onClick={handleCopyPin}
                whileTap={{ scale: 0.95 }}
                className="w-full mt-6 bg-white border-2 border-[#E53935] text-[#E53935] rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 hover:bg-[#E53935] hover:text-white transition-all shadow-lg"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copy PIN</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 space-y-4"
          >
            <h3 className="font-semibold text-[#121212] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#E53935]" />
              How it works
            </h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E53935] text-white flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <p className="text-gray-600 text-sm pt-1">
                  When your rider arrives, they will ask for your delivery PIN
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E53935] text-white flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <p className="text-gray-600 text-sm pt-1">
                  Share the 4-digit PIN shown above with your rider
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E53935] text-white flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <p className="text-gray-600 text-sm pt-1">
                  Your order will be marked as delivered once the PIN is verified
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4"
        >
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 text-sm mb-1">
                Security Tip
              </h4>
              <p className="text-amber-800 text-xs leading-relaxed">
                Never share this PIN with anyone except the GO7 rider delivering your order. 
                This ensures only the authorized person receives your delivery.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Action Bar */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live tracking active</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#E53935] font-semibold hover:underline"
          >
            Back to Tracking
          </button>
        </div>
      </div>
    </motion.div>
  );
}
