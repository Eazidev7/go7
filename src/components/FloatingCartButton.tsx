import { ShoppingCart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingCartButtonProps {
  itemCount: number;
  totalAmount: number;
  onClick: () => void;
}

export function FloatingCartButton({ itemCount, totalAmount, onClick }: FloatingCartButtonProps) {
  if (itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={onClick}
        className="fixed bottom-[10.5rem] right-4 z-40 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl shadow-2xl hover:shadow-red-500/50 transition-all hover:scale-105 active:scale-95"
      >
        <div className="flex items-center gap-3 px-5 py-4">
          {/* Cart Icon with Badge */}
          <div className="relative">
            <ShoppingCart className="w-6 h-6" strokeWidth={2.5} />
            {/* Item Count Badge */}
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-white text-red-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
              {itemCount}
            </div>
          </div>

          {/* Cart Info */}
          <div className="flex flex-col items-start">
            <span className="text-xs opacity-90">View Cart</span>
            <span className="text-sm font-bold">₦{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Pulse Animation */}
        <div className="absolute inset-0 rounded-2xl bg-red-500 animate-ping opacity-20" />
      </motion.button>
    </AnimatePresence>
  );
}
