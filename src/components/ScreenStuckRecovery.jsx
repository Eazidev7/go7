import React, { useEffect, useState } from 'react';

const DEFAULT_MS = 12000;

/**
 * Shows a friendly "Try again" if children stay in a loading state too long.
 * Use as Suspense fallback wrapper — users should never need to force-close the app.
 */
export default function ScreenStuckRecovery({
  message = 'Taking longer than usual…',
  timeoutMs = DEFAULT_MS,
}) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setStuck(true), timeoutMs);
    return () => window.clearTimeout(t);
  }, [timeoutMs]);

  if (stuck) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6 text-center bg-white">
        <p className="text-xl font-extrabold text-red-600">Go7</p>
        <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
          {message} Tap below — no need to close the app.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold text-sm w-full max-w-xs"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 bg-white">
      <div
        className="w-9 h-9 rounded-full border-2 border-red-100 border-t-red-500 animate-spin"
        aria-hidden
      />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );
}
