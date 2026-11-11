import React from 'react';
import { ArrowDownUp, LocateFixed, Home, Briefcase } from 'lucide-react';

/**
 * Presentational address panel for Book Delivery.
 * Autocomplete suggestion lists are passed as slots so BookDelivery keeps Places logic.
 */
export default function BookDeliveryAddressPanel({
  scenario = 'sending',
  onScenarioChange,
  pickupAddress = '',
  dropoffAddress = '',
  pickupCoords = null,
  dropoffCoords = null,
  pickupCoordsConfirmed = false,
  dropoffCoordsConfirmed = false,
  errors = {},
  hasHome = false,
  hasWork = false,
  onPickupChange,
  onDropoffChange,
  onPickupKeyDown,
  onDropoffKeyDown,
  onPickupBlur,
  onDropoffBlur,
  onPickupFocus,
  onDropoffFocus,
  onGps,
  onSwap,
  onQuickAction,
  pickupSuggestionsSlot = null,
  dropoffSuggestionsSlot = null,
  coordinatesError = null,
  routeSummary = null,
}) {
  const pickupReady = Boolean(pickupCoordsConfirmed && pickupCoords?.lat != null);
  const dropoffReady = Boolean(dropoffCoordsConfirmed && dropoffCoords?.lat != null);

  const fieldInputClass = (hasError, hasCoords) =>
    `form-input-enhanced w-full p-4 border rounded-xl transition-all duration-300 bg-white ${
      hasError
        ? 'border-red-500 shadow-lg shadow-red-200'
        : hasCoords
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 hover:border-red-300 hover:shadow-lg'
    }`;

  const QuickActions = ({ field }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        type="button"
        onClick={() => onQuickAction?.(field, 'home')}
        title={hasHome ? 'Use saved Home' : 'Add a Home address in Profile first'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          hasHome
            ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
        }`}
      >
        <Home className="w-3.5 h-3.5" />
        Home
      </button>
      <button
        type="button"
        onClick={() => onQuickAction?.(field, 'work')}
        title={hasWork ? 'Use saved Work' : 'Add a Work address in Profile first'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          hasWork
            ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
        }`}
      >
        <Briefcase className="w-3.5 h-3.5" />
        Work
      </button>
    </div>
  );

  const gpsButtonClass =
    'button-enhanced inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl whitespace-nowrap transform transition-all duration-300 shrink-0';

  return (
    <div>
      <h3 className="text-lg font-medium mb-3 text-gray-900">Where is this going?</h3>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <button
          type="button"
          onClick={() => onScenarioChange?.('sending')}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
            scenario === 'sending'
              ? 'bg-red-600 text-white border-red-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
          }`}
        >
          I&apos;m sending a package
        </button>
        <button
          type="button"
          onClick={() => onScenarioChange?.('receiving')}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
            scenario === 'receiving'
              ? 'bg-red-600 text-white border-red-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
          }`}
        >
          I&apos;m receiving a package
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        {scenario === 'sending'
          ? 'Your location can fill Pick up from. Then enter where to deliver.'
          : 'Your location can fill Deliver to. Then enter where to pick up from.'}
      </p>

      <div className="space-y-3">
        {/* Pick up from */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Pick up from *</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => onPickupChange?.(e.target.value)}
                onKeyDown={onPickupKeyDown}
                onBlur={onPickupBlur}
                onFocus={onPickupFocus}
                className={fieldInputClass(Boolean(errors.pickupAddress), Boolean(pickupCoords))}
                placeholder="Search a real address"
                autoComplete="off"
              />
              {pickupCoords ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ) : null}
              {pickupSuggestionsSlot}
            </div>
            <button
              type="button"
              onClick={() => onGps?.('pickup')}
              className={gpsButtonClass}
              aria-label="Use GPS for pick-up"
            >
              <LocateFixed className="w-4 h-4" />
              <span>Use GPS</span>
            </button>
          </div>
          <QuickActions field="pickup" />
          {errors.pickupAddress ? (
            <p className="text-red-500 text-sm mt-1">{errors.pickupAddress}</p>
          ) : null}
          {!errors.pickupAddress && !pickupCoords ? (
            <p className="text-gray-500 text-xs mt-1">
              Search and pick a suggestion, or use GPS / Home / Work
            </p>
          ) : null}
          {pickupReady ? (
            <p className="text-green-700 text-xs mt-1 font-medium">Pick-up pinned on map</p>
          ) : null}
        </div>

        {/* Swap */}
        <div className="flex justify-center py-1">
          <button
            type="button"
            onClick={onSwap}
            aria-label="Swap pick-up and deliver-to addresses"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-red-300 hover:text-red-700 shadow-sm transition-colors"
          >
            <ArrowDownUp className="w-4 h-4" />
            Swap addresses
          </button>
        </div>

        {/* Deliver to */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Deliver to *</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={dropoffAddress}
                onChange={(e) => onDropoffChange?.(e.target.value)}
                onKeyDown={onDropoffKeyDown}
                onBlur={onDropoffBlur}
                onFocus={onDropoffFocus}
                className={fieldInputClass(Boolean(errors.dropoffAddress), Boolean(dropoffCoords))}
                placeholder="Search a real address"
                autoComplete="off"
              />
              {dropoffCoords ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ) : null}
              {dropoffSuggestionsSlot}
            </div>
            <button
              type="button"
              onClick={() => onGps?.('dropoff')}
              className={gpsButtonClass}
              aria-label="Use GPS for deliver-to"
            >
              <LocateFixed className="w-4 h-4" />
              <span>Use GPS</span>
            </button>
          </div>
          <QuickActions field="dropoff" />
          {errors.dropoffAddress ? (
            <p className="text-red-500 text-sm mt-1">{errors.dropoffAddress}</p>
          ) : null}
          {!errors.dropoffAddress && !dropoffCoords ? (
            <p className="text-gray-500 text-xs mt-1">
              Search and pick a suggestion, or use GPS / Home / Work
            </p>
          ) : null}
          {dropoffReady ? (
            <p className="text-green-700 text-xs mt-1 font-medium">Deliver-to pinned on map</p>
          ) : null}
        </div>

        {coordinatesError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {coordinatesError}
          </div>
        ) : null}

        {routeSummary ? (
          <p className="text-xs text-center text-gray-500">{routeSummary}</p>
        ) : null}
      </div>
    </div>
  );
}
