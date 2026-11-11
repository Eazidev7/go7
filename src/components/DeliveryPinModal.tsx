import { useState, useEffect } from 'react';
import { X, Shield, Copy, Check, RefreshCw, Eye, EyeOff, Lock, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getVerificationCode } from '../services/deliveryVerification';

interface DeliveryPinModalProps {
  orderId: string;
  orderNumber?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DeliveryPinModal({
  orderId,
  orderNumber = 'GO7-XXXX',
  isOpen,
  onClose,
}: DeliveryPinModalProps) {
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pinHidden, setPinHidden] = useState(false);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);

  // Fetch verification code
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [orderId, isOpen]);

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

  // Format PIN with spaces
  const formattedPin = pin.split('').join(' ');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 max-w-md mx-auto overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#E53935] to-[#c62828] px-6 py-5 relative overflow-hidden">
              {/* Animated background elements */}
              <motion.div
                className="absolute w-32 h-32 bg-white/10 rounded-full -top-16 -right-16"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-white">
                    <h2 className="font-bold">Delivery PIN</h2>
                    <p className="text-xs opacity-90">Order {orderNumber}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      <RefreshCw className="w-10 h-10 text-[#E53935]" />
                    </motion.div>
                    <p className="text-gray-500 mt-3 text-sm">Generating PIN...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="pin"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* PIN Display */}
                    <div className="bg-gradient-to-br from-[#E53935] via-[#d32f2f] to-[#c62828] rounded-2xl p-6 relative overflow-hidden mb-4">
                      {/* Decorative elements */}
                      <motion.div
                        className="absolute -top-8 -right-8 w-24 h-24"
                        animate={{
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Sparkles className="w-full h-full text-white/10" />
                      </motion.div>

                      <div className="relative z-10">
                        <div className="text-center mb-3">
                          <div className="flex items-center justify-center gap-2 text-white/80 text-xs mb-2">
                            <Lock className="w-4 h-4" />
                            <span>Share with rider only</span>
                          </div>
                        </div>

                        {/* PIN */}
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl py-6 px-4 relative">
                          {pinHidden ? (
                            <div className="text-7xl font-bold text-white text-center tracking-[0.3em] font-mono">
                              ••••
                            </div>
                          ) : (
                            <motion.div
                              initial={{ scale: 0.9 }}
                              animate={{ scale: 1 }}
                              className="text-7xl font-bold text-white text-center tracking-[0.3em] font-mono"
                            >
                              {formattedPin}
                            </motion.div>
                          )}

                          {/* Toggle button */}
                          <button
                            onClick={() => setPinHidden(!pinHidden)}
                            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                          >
                            {pinHidden ? (
                              <Eye className="w-4 h-4 text-white" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </div>

                        {/* Expiry */}
                        {expiryTime && (
                          <div className="flex items-center justify-center gap-1.5 text-white/70 text-xs mt-3">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Expires {expiryTime.toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Copy Button */}
                    <motion.button
                      onClick={handleCopyPin}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-white border-2 border-[#E53935] text-[#E53935] rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:bg-[#E53935] hover:text-white transition-all mb-4"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy PIN</span>
                        </>
                      )}
                    </motion.button>

                    {/* Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-600 text-center leading-relaxed">
                        Your rider will ask for this PIN when they arrive. 
                        Only share it with the GO7 rider delivering your order.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
