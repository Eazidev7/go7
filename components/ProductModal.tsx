import React, { useState, useEffect } from 'react';
import { VariantSelector } from './VariantSelector';
import { AddOnSelector } from './AddOnSelector';
import { MeasurementSelector } from '../src/components/MeasurementSelector';
import { computeLinePrice, UnitType } from '../src/types/measurementTypes';
import './ProductModal.css';

interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  productType: 'food' | 'market';
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  estimatedDeliveryTime: string;
  variants?: Variant[];
  addons?: AddOn[];
  isAvailable: boolean;
  category: string;
}

interface Variant {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  isAvailable: boolean;
  // Measurement fields
  unitType?: UnitType;
  unitLabel?: string;
  variants?: Array<{id: string; label: string; price: number; imageUrl?: string}>;
  pieceCountPerUnit?: number;
  maxQty?: number;
  minQty?: number;
  qtyStep?: number;
  customLabel?: string;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  countable: boolean;
  maxQuantity?: number;
  // Measurement fields  
  unitType?: UnitType;
  unitLabel?: string;
  variants?: Array<{id: string; label: string; price: number; imageUrl?: string}>;
  pieceCountPerUnit?: number;
  maxQty?: number;
  minQty?: number;
  qtyStep?: number;
  customLabel?: string;
}

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    selectedVariant: Variant | null,
    selectedAddons: Array<{ addon: AddOn; quantity: number }>,
    quantity: number
  ) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart
}) => {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Array<{ addon: AddOn; quantity: number }>>([]);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  
  // Measurement system state
  const [measurementVariant, setMeasurementVariant] = useState<{id: string; label: string; price: number} | null>(null);
  const [addonMeasurements, setAddonMeasurements] = useState<Map<string, {variant: any; quantity: number}>>(new Map());

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants?.[0] || null);
      setSelectedAddons([]);
      setQuantity(1);
    }
  }, [product]);

  // Calculate total price whenever selections change
  useEffect(() => {
    if (!product) return;

    let basePrice = (product as any).price || 0;
    
    // Use variant price if selected (traditional variant system)
    if (selectedVariant && product.productType === 'market' && !selectedVariant.unitType) {
      basePrice = selectedVariant.price;
    }
    
    // For measurement variants, use computeLinePrice
    if (selectedVariant?.unitType) {
      const measurementVariantData = measurementVariant || 
        (selectedVariant.variants && selectedVariant.variants[0]);
      
      basePrice = computeLinePrice({
        basePrice: selectedVariant.price,
        unitType: selectedVariant.unitType,
        qty: quantity,
        selectedVariant: measurementVariantData
      });
    } else {
      // Traditional pricing
      basePrice = basePrice * quantity;
    }

    // Add addon prices (with measurement support)
    const addonTotal = selectedAddons.reduce((sum, item) => {
      if (item.addon.unitType) {
        const addonMeasurement = addonMeasurements.get(item.addon.id);
        return sum + computeLinePrice({
          basePrice: item.addon.price,
          unitType: item.addon.unitType,
          qty: item.quantity,
          selectedVariant: addonMeasurement?.variant
        });
      } else {
        // Traditional addon pricing
        return sum + (item.addon.price * item.quantity);
      }
    }, 0);

    setTotalPrice(basePrice + addonTotal);
  }, [product, selectedVariant, selectedAddons, quantity, measurementVariant, addonMeasurements]);

  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);
  };

  const handleAddonToggle = (addon: AddOn) => {
    setSelectedAddons(prev => {
      const existing = prev.find(item => item.addon.id === addon.id);
      
      if (existing) {
        // Remove addon
        return prev.filter(item => item.addon.id !== addon.id);
      } else {
        // Add addon with default quantity
        return [...prev, { addon, quantity: 1 }];
      }
    });
  };

  const handleAddonQuantityChange = (addonId: string, newQuantity: number) => {
    setSelectedAddons(prev => 
      prev.map(item => 
        item.addon.id === addonId 
          ? { ...item, quantity: Math.max(1, Math.min(newQuantity, item.addon.maxQuantity || 10)) }
          : item
      )
    );
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(1, Math.min(newQuantity, 99)));
  };

  const handleAddToCart = () => {
    if (!product.isAvailable) return;
    
    // Validate market product has variant selected
    if (product.productType === 'market' && !selectedVariant) {
      alert('Please select a variant');
      return;
    }

    onAddToCart(product, selectedVariant, selectedAddons, quantity);
  };

  if (!isOpen || !product) return null;

  return (
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <button 
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path 
                d="M18 6L6 18M6 6L18 18" 
                stroke="#666" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Product Image */}
        <div className="product-image">
          <img 
            src={product.imageUrl} 
            alt={product.name}
            loading="lazy"
          />
          {!product.isAvailable && (
            <div className="unavailable-overlay">
              <span>Currently Unavailable</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-content">
          <div className="product-header">
            <h2 className="product-name">{product.name}</h2>
            <div className="vendor-info">
              <span className="vendor-name">{product.vendorName}</span>
              <div className="vendor-meta">
                <div className="rating">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path 
                      d="M7 1L8.545 4.13L12 4.635L9.5 7.07L10.09 10.5L7 8.885L3.91 10.5L4.5 7.07L2 4.635L5.455 4.13L7 1Z" 
                      fill="#FFD700"
                    />
                  </svg>
                  <span>{product.vendorRating}</span>
                </div>
                <span className="delivery-time">{product.estimatedDeliveryTime}</span>
              </div>
            </div>
          </div>

          <p className="product-description">{product.description}</p>

          {/* Variant Selection for Market Products */}
          {product.productType === 'market' && product.variants && product.variants.length > 0 && (
            <>
              {/* Traditional Variant Selector */}
              {!selectedVariant?.unitType && (
                <VariantSelector
                  variants={product.variants}
                  selectedVariant={selectedVariant}
                  onVariantSelect={handleVariantSelect}
                />
              )}
              
              {/* Measurement System Selector */}
              {selectedVariant?.unitType && (
                <MeasurementSelector
                  unitType={selectedVariant.unitType}
                  unitLabel={selectedVariant.unitLabel}
                  customLabel={selectedVariant.customLabel}
                  variants={selectedVariant.variants}
                  quantity={quantity}
                  selectedVariant={measurementVariant}
                  maxQty={selectedVariant.maxQty}
                  minQty={selectedVariant.minQty || 1}
                  onQuantityChange={setQuantity}
                  onVariantChange={setMeasurementVariant}
                />
              )}
            </>
          )}

          {/* Add-ons Selection for Food Products */}
          {product.productType === 'food' && product.addons && product.addons.length > 0 && (
            <div className="addons-section">
              <h3 className="section-title">Add-ons</h3>
              <div className="addons-list">
                {product.addons.map(addon => {
                  const selectedAddon = selectedAddons.find(item => item.addon.id === addon.id);
                  const isSelected = !!selectedAddon;
                  const addonQuantity = selectedAddon?.quantity || 1;
                  const addonMeasurement = addonMeasurements.get(addon.id);

                  return (
                    <div key={addon.id} className="addon-container">
                      {/* Traditional Addon Selector */}
                      {!addon.unitType && (
                        <AddOnSelector
                          addon={addon}
                          isSelected={isSelected}
                          quantity={addonQuantity}
                          onToggle={() => handleAddonToggle(addon)}
                          onQuantityChange={(qty) => handleAddonQuantityChange(addon.id, qty)}
                        />
                      )}
                      
                      {/* Measurement-based Addon */}
                      {addon.unitType && (
                        <div className="measurement-addon">
                          <div className="addon-header">
                            <label className="addon-name">{addon.name}</label>
                            <span className="addon-price">₦{addon.price.toLocaleString()}</span>
                          </div>
                          <MeasurementSelector
                            unitType={addon.unitType}
                            unitLabel={addon.unitLabel}
                            customLabel={addon.customLabel}
                            variants={addon.variants}
                            quantity={addonMeasurement?.quantity || 1}
                            selectedVariant={addonMeasurement?.variant}
                            maxQty={addon.maxQty}
                            minQty={addon.minQty || 1}
                            onQuantityChange={(qty) => {
                              setAddonMeasurements(prev => {
                                const newMap = new Map(prev);
                                newMap.set(addon.id, {
                                  variant: addonMeasurement?.variant || null,
                                  quantity: qty
                                });
                                return newMap;
                              });
                              handleAddonQuantityChange(addon.id, qty);
                            }}
                            onVariantChange={(variant) => {
                              setAddonMeasurements(prev => {
                                const newMap = new Map(prev);
                                newMap.set(addon.id, {
                                  variant,
                                  quantity: addonMeasurement?.quantity || 1
                                });
                                return newMap;
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity and Add to Cart */}
          <div className="product-footer">
            {/* Only show traditional quantity selector for products without measurement systems */}
            {!selectedVariant?.unitType && (
              <div className="quantity-section">
                <label className="quantity-label">Quantity</label>
                <div className="quantity-controls">
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 8H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <span className="quantity-display">{quantity}</span>
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= 99}
                    aria-label="Increase quantity"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 4V12M4 8H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <button
              className={`add-to-cart-btn ${!product.isAvailable ? 'disabled' : ''}`}
              onClick={handleAddToCart}
              disabled={!product.isAvailable}
            >
              <span className="btn-text">
                {product.isAvailable ? 'Add to Cart' : 'Unavailable'}
              </span>
              <span className="btn-price">₦{totalPrice.toLocaleString()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};