import React from 'react';
import { MessageCircle } from 'lucide-react';
import {
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_URL,
  openWhatsAppSupport,
} from '../../constants/supportContact';

/**
 * Sticky support strip above mobile bottom nav — opens WhatsApp instantly.
 */
export default function WhatsAppSupportBar({ className = '' }) {
  const handleClick = (e) => {
    e.preventDefault();
    openWhatsAppSupport();
  };

  return (
    <a
      href={SUPPORT_WHATSAPP_URL}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed left-0 right-0 z-[45] mx-3 rounded-2xl shadow-lg border border-red-400/30 bg-gradient-to-r from-[#E30613] to-[#B8050F] text-white active:scale-[0.98] transition-transform ${className}`}
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
      aria-label={`Chat GO7 support on WhatsApp ${SUPPORT_WHATSAPP_DISPLAY}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-white" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold leading-tight">Need help? Chat on WhatsApp</p>
          <p className="text-xs text-white/90 truncate">
            {SUPPORT_WHATSAPP_DISPLAY} · Tap to message support
          </p>
        </div>
        <span className="flex-shrink-0 text-xs font-bold bg-white text-[#E30613] px-3 py-2 rounded-xl shadow-sm">
          Chat
        </span>
      </div>
    </a>
  );
}
