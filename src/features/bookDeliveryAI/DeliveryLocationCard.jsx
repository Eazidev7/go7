import React from 'react';

/** Single resolved location → confirm / change (matches the mockup card). */
export function LocationConfirmCard({ role, location, onConfirm, onChange, disabled }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg">📍</span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-gray-800 truncate">{location.name}</p>
          <p className="text-[11px] text-gray-400 capitalize">{role} · {location.type || 'area'}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="bg-[#E30613] text-white text-[12px] font-semibold px-3.5 py-1.5 rounded-lg disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={onChange}
          disabled={disabled}
          className="border border-gray-300 text-gray-600 text-[12px] font-semibold px-3.5 py-1.5 rounded-lg disabled:opacity-50"
        >
          Change
        </button>
      </div>
    </div>
  );
}

/** Multiple candidates — the AI never silently picks. */
export function LocationCandidatesCard({ candidates, onSelect, onCustom, disabled }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl p-2 shadow-sm space-y-1">
      {candidates.map((c, i) => (
        <button
          key={c.id || i}
          onClick={() => onSelect(i)}
          disabled={disabled}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-red-50 text-left transition-colors disabled:opacity-50"
        >
          <span className="text-base">📍</span>
          <span className="flex-1 text-[14px] font-medium text-gray-800 truncate">{c.name}</span>
          <span className="text-[10px] text-gray-400 capitalize">{c.type}</span>
        </button>
      ))}
      <button
        onClick={onCustom}
        disabled={disabled}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left text-gray-500 disabled:opacity-50"
      >
        <span className="text-base">🔍</span>
        <span className="text-[13px] font-medium">Enter a different location</span>
      </button>
    </div>
  );
}
