import React from 'react';
import { MessageCircle, ChevronRight } from 'lucide-react';
import {
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_URL,
  openWhatsAppSupport,
} from '../../constants/supportContact';

/**
 * Large tappable card for profile / help screens.
 */
export default function WhatsAppSupportCard({ subtitle = 'Average reply in minutes' }) {
  return (
    <button
      type="button"
      onClick={() => openWhatsAppSupport()}
      className="w-full text-left rounded-2xl p-4 bg-gradient-to-br from-[#E30613] to-[#B8050F] text-white shadow-lg border border-red-400/20 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <MessageCircle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base">WhatsApp Support</p>
          <p className="text-sm text-white/90">{SUPPORT_WHATSAPP_DISPLAY}</p>
          <p className="text-xs text-white/80 mt-0.5">{subtitle}</p>
        </div>
        <ChevronRight className="w-5 h-5 shrink-0 opacity-90" />
      </div>
    </button>
  );
}
