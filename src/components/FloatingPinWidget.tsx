import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Maximize2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getVerificationCode } from '../services/deliveryVerification';

interface FloatingPinWidgetProps {
  orderId: string;
  isVisible: boolean;
  onExpand?: () => void; // Callback to open full PIN screen
  position?: 'top' | 'bottom';
}

/**
 * Floating PIN widget that appears during delivery tracking
 * Shows a compact, always-visible PIN display that can be expanded
 */
export function FloatingPinWidget({
  orderId,
  isVisible,
  onExpand,
  position = 'top',
}: FloatingPinWidgetProps) {
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [pinHidden, setPinHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Fetch verification code
  useEffect(() => {
    if (isVisible) {
      const fetchPin = async () => {
        try {
          setLoading(true);
          const response = await getVerificationCode(orderId);
          if (response.success) {
            setPin(response.data.code);
          }
        } catch (error) {
          console.error('Failed to fetch PIN:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchPin();
    }
  }, [orderId, isVisible]);

  // Copy PIN
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      toast.success('PIN copied!', { duration: 1500 });
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // Toggle visibility
  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPinHidden(!pinHidden);
  };

  if (!isVisible || loading) return null;

  return (
    <AnimatePresence>
      {!isMinimized ? (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`fixed left-1/2 -translate-x-1/2 z-40 ${
            position === 'top' ? 'top-20' : 'bottom-24'
          }`}
          onClick={onExpand}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-[#E53935] to-[#c62828] rounded-2xl shadow-2xl cursor-pointer overflow-hidden"
            style={{ 
              boxShadow: '0 8px 32px rgba(229, 57, 53, 0.3), 0 0 0 1px rgba(255,255,255,0.1) inset' 
            }}
          >
            {/* Animated background gradient */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />

            <div className="relative px-5 py-3">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-white/90" />
                <span className="text-white/90 text-xs font-medium">
                  Delivery PIN
                </span>
                <motion.div
                  className="ml-auto flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Toggle visibility button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleToggleVisibility}
                    className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    {pinHidden ? (
                      <Eye className="w-3 h-3 text-white" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-white" />
                    )}
                  </motion.button>

                  {/* Copy button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCopy}
                    className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : (
                      <Copy className="w-3 h-3 text-white" />
                    )}
                  </motion.button>

                  {/* Expand button */}
                  {onExpand && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpand();
                      }}
                      className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <Maximize2 className="w-3 h-3 text-white" />
                    </motion.button>
                  )}
                </motion.div>
              </div>

              {/* PIN Display */}
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
                {pinHidden ? (
                  <div className="text-4xl font-bold text-white text-center tracking-[0.4em] font-mono">
                    {'•'.repeat(pin.length || 6)}
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-bold text-white text-center tracking-[0.4em] font-mono"
                  >
                    {pin.split('').join(' ')}
                  </motion.div>
                )}
              </div>

              {/* Hint text */}
              <p className="text-white/70 text-[10px] text-center mt-2">
                Share with rider when they arrive
              </p>
            </div>
          </motion.div>

          {/* Pulsing ring effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-[#E53935]"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      ) : (
        /* Minimized state - small floating button */
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          onClick={() => setIsMinimized(false)}
          className={`fixed right-4 z-40 w-14 h-14 bg-gradient-to-br from-[#E53935] to-[#c62828] rounded-full shadow-xl flex items-center justify-center ${
            position === 'top' ? 'top-20' : 'bottom-24'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Shield className="w-6 h-6 text-white" />
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
