import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFare, ServiceType, PackageSize } from './useFare';
import './fareCalculator.css';

const FareCalculator: React.FC = () => {
  const {
    inputs,
    result,
    updateDistance,
    updateService,
    updateSize,
    getDistanceHelperText,
    isCalculationValid
  } = useFare();

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `₦${amount.toLocaleString('en-NG')}`;
  };

  // Handle distance slider change
  const handleDistanceSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    updateDistance(value);
    triggerUpdateAnimation();
  }, [updateDistance]);

  // Handle distance input change
  const handleDistanceInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    updateDistance(value);
    triggerUpdateAnimation();
  }, [updateDistance]);

  // Handle service toggle
  const handleServiceChange = useCallback((service: ServiceType) => {
    updateService(service);
    triggerUpdateAnimation();
  }, [updateService]);

  // Handle package size change
  const handleSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSize(e.target.value as PackageSize);
    triggerUpdateAnimation();
  }, [updateSize]);

  // Trigger update animation
  const triggerUpdateAnimation = useCallback(() => {
    setIsUpdating(true);
    setTimeout(() => setIsUpdating(false), 200);
  }, []);

  // Handle CTA clicks with analytics
  const handleBookDelivery = useCallback(() => {
    window.dispatchEvent(new CustomEvent('fareCalc', {
      detail: { 
        action: 'cta_click', 
        cta: 'book_delivery',
        fareAmount: result.fareRounded,
        service: inputs.service,
        distance: inputs.distanceKm
      }
    }));
  }, [result.fareRounded, inputs.service, inputs.distanceKm]);

  const handleTrackPackage = useCallback(() => {
    window.dispatchEvent(new CustomEvent('fareCalc', {
      detail: { action: 'cta_click', cta: 'track_package' }
    }));
  }, []);

  // Keyboard navigation for slider
  const handleSliderKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const step = 0.1;
    const pageStep = 1.0;
    let newValue = inputs.distanceKm;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(0.5, inputs.distanceKm - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(25, inputs.distanceKm + step);
        break;
      case 'PageDown':
        newValue = Math.max(0.5, inputs.distanceKm - pageStep);
        break;
      case 'PageUp':
        newValue = Math.min(25, inputs.distanceKm + pageStep);
        break;
      case 'Home':
        newValue = 0.5;
        break;
      case 'End':
        newValue = 25;
        break;
      default:
        return;
    }

    e.preventDefault();
    updateDistance(newValue);
    triggerUpdateAnimation();
  }, [inputs.distanceKm, updateDistance]);

  const distanceHelperText = getDistanceHelperText(inputs.distanceKm);

  return (
    <section id="pricing" className="fare-calculator py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="fare-card">
          {/* Header */}
          <div className="fare-header">
            <h2 className="fare-title">Delivery Pricing (Abeokuta)</h2>
            <p className="fare-subtitle">
              Estimate your fare instantly. Switch between Standard and Express.
            </p>
          </div>

          {/* Controls */}
          <div className="fare-controls">
            {/* Service Toggle */}
            <div className="control-group">
              <label className="control-label" id="service-label">
                Service Type
              </label>
              <div 
                className="segmented-control" 
                role="group" 
                aria-labelledby="service-label"
              >
                <button
                  type="button"
                  className={`segmented-option ${inputs.service === 'standard' ? 'active' : ''}`}
                  onClick={() => handleServiceChange('standard')}
                  aria-pressed={inputs.service === 'standard'}
                  aria-describedby="standard-desc"
                >
                  Standard
                </button>
                <button
                  type="button"
                  className={`segmented-option ${inputs.service === 'express' ? 'active' : ''}`}
                  onClick={() => handleServiceChange('express')}
                  aria-pressed={inputs.service === 'express'}
                  aria-describedby="express-desc"
                >
                  Express
                </button>
              </div>
              <div id="standard-desc" className="sr-only">
                Standard delivery with regular pricing and timing
              </div>
              <div id="express-desc" className="sr-only">
                Express delivery with faster service and premium pricing
              </div>
            </div>

            {/* Distance Control */}
            <div className="control-group">
              <label className="control-label" htmlFor="distance-slider">
                Distance
              </label>
              <div className="distance-group">
                <div className="distance-input-row">
                  <input
                    id="distance-slider"
                    type="range"
                    min="0.5"
                    max="25"
                    step="0.1"
                    value={inputs.distanceKm}
                    onChange={handleDistanceSliderChange}
                    onKeyDown={handleSliderKeyDown}
                    className="distance-slider"
                    aria-describedby={distanceHelperText ? "distance-error" : "distance-desc"}
                  />
                  <input
                    type="number"
                    min="0.5"
                    max="25"
                    step="0.1"
                    value={inputs.distanceKm.toFixed(1)}
                    onChange={handleDistanceInputChange}
                    className="distance-input"
                    aria-label="Distance in kilometers"
                  />
                  <span className="text-sm text-gray-500">km</span>
                </div>
                <div id="distance-desc" className="sr-only">
                  Use arrow keys to adjust distance, Page Up/Down for larger steps
                </div>
                {distanceHelperText && (
                  <div id="distance-error" className="distance-helper" role="alert">
                    {distanceHelperText}
                  </div>
                )}
              </div>
            </div>

            {/* Package Size */}
            <div className="control-group">
              <label className="control-label" htmlFor="package-size">
                Package Size
              </label>
              <select
                id="package-size"
                value={inputs.size}
                onChange={handleSizeChange}
                className="size-select"
                aria-describedby="size-desc"
              >
                <option value="s">Small (≤2kg)</option>
                <option value="m">Medium (≤5kg)</option>
                <option value="l">Large (≤10kg)</option>
              </select>
              <div id="size-desc" className="sr-only">
                Select package size to calculate accurate pricing
              </div>
            </div>
          </div>

          {/* Results */}
          <div className={`fare-results ${isUpdating ? 'updating' : ''}`}>
            <div className="fare-amount" aria-live="polite" aria-atomic="true">
              {formatCurrency(result.fareRounded)}
            </div>
            <div className="fare-eta" aria-live="polite">
              ETA: {result.etaLabel}
            </div>

            {/* Breakdown Toggle */}
            <button
              type="button"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="breakdown-toggle"
              aria-expanded={showBreakdown}
              aria-controls="fare-breakdown"
            >
              <span>View breakdown</span>
              <span className={`breakdown-icon ${showBreakdown ? 'open' : ''}`}>
                ▼
              </span>
            </button>

            {/* Breakdown Content */}
            <div 
              id="fare-breakdown"
              className={`breakdown-content ${showBreakdown ? 'open' : 'closed'}`}
              aria-hidden={!showBreakdown}
            >
              <div className="breakdown-list" role="table" aria-label="Fare breakdown">
                <div className="breakdown-item" role="row">
                  <span className="breakdown-label" role="cell">Base fare</span>
                  <span className="breakdown-value" role="cell">
                    {formatCurrency(result.breakdown.baseFare)}
                  </span>
                </div>
                
                <div className="breakdown-item" role="row">
                  <span className="breakdown-label" role="cell">
                    Distance ({inputs.distanceKm.toFixed(1)}km × ₦{
                      inputs.service === 'standard' ? '150' : '220'
                    }/km)
                  </span>
                  <span className="breakdown-value" role="cell">
                    {formatCurrency(result.breakdown.distanceFare)}
                  </span>
                </div>

                {result.breakdown.sizeFare > 0 && (
                  <div className="breakdown-item" role="row">
                    <span className="breakdown-label" role="cell">
                      Size multiplier ({inputs.size === 's' ? 'Small' : inputs.size === 'm' ? 'Medium' : 'Large'})
                    </span>
                    <span className="breakdown-value" role="cell">
                      +{formatCurrency(result.breakdown.sizeFare)}
                    </span>
                  </div>
                )}

                {result.breakdown.surgeFare > 0 && (
                  <div className="breakdown-item surge" role="row">
                    <span className="breakdown-label" role="cell">Surge pricing (6-9pm)</span>
                    <span className="breakdown-value" role="cell">
                      +{formatCurrency(result.breakdown.surgeFare)}
                    </span>
                  </div>
                )}

                {result.breakdown.minFareApplied && (
                  <div className="breakdown-item min-fare" role="row">
                    <span className="breakdown-label" role="cell">
                      Minimum fare applied
                    </span>
                    <span className="breakdown-value" role="cell">
                      {inputs.service === 'standard' ? '₦900' : '₦1,400'}
                    </span>
                  </div>
                )}

                <div className="breakdown-item total" role="row">
                  <span className="breakdown-label" role="cell">Total</span>
                  <span className="breakdown-value" role="cell">
                    {formatCurrency(result.fareRounded)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Row */}
          <div className="cta-row">
            <Link
              to="/book"
              className={`cta-button primary ${!isCalculationValid ? 'disabled' : ''}`}
              onClick={handleBookDelivery}
              aria-disabled={!isCalculationValid}
            >
              🛵 Book a Delivery
            </Link>
            <Link
              to="/track"
              className="cta-button ghost"
              onClick={handleTrackPackage}
            >
              📦 Track Package
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FareCalculator;