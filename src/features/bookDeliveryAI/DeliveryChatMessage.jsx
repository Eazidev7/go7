import React from 'react';
import { renderInline } from './deliveryChatState';

const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function BotAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#E30613] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-sm">
      G7
    </div>
  );
}

export default function DeliveryChatMessage({ msg, children }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <div className="mr-2 mt-1"><BotAvatar /></div>}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={
            isUser
              ? 'bg-[#E30613] text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-[15px] leading-snug shadow-sm'
              : 'bg-white text-gray-800 rounded-2xl rounded-tl-md px-4 py-2.5 text-[15px] leading-snug shadow-sm border border-gray-100'
          }
        >
          {msg.text.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>{renderInline(line)}</p>
          ))}
        </div>
        {children}
        <span className="text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-0.5">
          {fmtTime(msg.ts)}{isUser && ' ✓✓'}
        </span>
      </div>
    </div>
  );
}
