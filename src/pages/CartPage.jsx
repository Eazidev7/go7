import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../contexts/AuthContext';
import { FaTrash, FaPlus, FaMinus, FaArrowLeft } from 'react-icons/fa';

const CartPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  
  const { 
    cart, 
    removeFromCart, 
    updateQty, 
    clearCart,
    getSubtotal,
    getAddonTotal,
    getCartTotal,
    error,
    clearError 
  } = useCartStore();

  // Format currency
  const formatCurrency = (amount) => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(safeAmount);
  };

  // Calculate line total for item
  const getItemTotal = (item) => {
    const baseTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
    const addonTotal = (item.addons || []).reduce((sum, addon) => {
      return sum + ((Number(addon.price) || 0) * (Number(addon.qty) || 1));
    }, 0);
    return baseTotal + addonTotal;
  };

  const handleQuantityUpdate = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
    } else {
      updateQty(productId, newQty);
    }
  };

  const handleCheckout = () => {
    if (!isLoggedIn) {
      // Show login prompt
      const shouldLogin = window.confirm("You need to login to complete your order.");
      if (shouldLogin) {
        navigate('/login');
      }
      return;
    }

    if (cart.length === 0) {
      return;
    }

    navigate('/checkout');
  };

  const subtotal = getSubtotal();
  const addonTotal = getAddonTotal();
  const deliveryFee = 500; // Placeholder
  const total = subtotal + addonTotal + deliveryFee;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      paddingBottom: '100px' // For bottom nav
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px 20px',
        borderBottom: '1px solid #eee',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            <FaArrowLeft size={18} />
          </button>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>
            Your Cart
          </h1>
          {cart.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all items from cart?')) {
                  clearCart();
                }
              }}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: '1px solid #ddd',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#666',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          color: '#c33',
          padding: '12px 20px',
          margin: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: '#c33',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Cart Content */}
      {cart.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#666'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>🛒</div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '500',
            margin: '0 0 8px 0'
          }}>Your cart is empty</h2>
          <p style={{
            fontSize: '14px',
            margin: '0 0 24px 0'
          }}>Add items from restaurants to get started</p>
          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#E0001B',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Browse Restaurants
          </button>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div style={{
            backgroundColor: 'white',
            margin: '12px 20px',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {cart.map((item, index) => (
              <div key={`${item.productId}-${index}`} style={{
                padding: '16px',
                borderBottom: index < cart.length - 1 ? '1px solid #f0f0f0' : 'none'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '12px'
                }}>
                  {/* Item Image */}
                  <img
                    src={item.image || '/placeholder-food.jpg'}
                    alt={item.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      backgroundColor: '#f5f5f5'
                    }}
                    onError={(e) => {
                      e.target.src = '/placeholder-food.jpg';
                    }}
                  />
                  
                  {/* Item Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1a1a1a'
                      }}>
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#999',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>

                    {/* Base Price */}
                    <div style={{
                      fontSize: '14px',
                      color: '#666',
                      marginBottom: '4px'
                    }}>
                      {formatCurrency(item.price)} each
                    </div>

                    {/* Add-ons */}
                    {item.addons && item.addons.length > 0 && (
                      <div style={{
                        fontSize: '12px',
                        color: '#888',
                        marginBottom: '8px',
                        fontStyle: 'italic'
                      }}>
                        Add-ons: {item.addons.map(addon => 
                          `${addon.name} x${addon.qty} (${formatCurrency(addon.price * addon.qty)})`
                        ).join(', ')}
                      </div>
                    )}

                    {/* Quantity Controls & Total */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        padding: '4px'
                      }}>
                        <button
                          onClick={() => handleQuantityUpdate(item.productId, item.qty - 1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#E0001B',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: '14px'
                          }}
                        >
                          <FaMinus size={10} />
                        </button>
                        <span style={{
                          minWidth: '20px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => handleQuantityUpdate(item.productId, item.qty + 1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#E0001B',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: '14px'
                          }}
                        >
                          <FaPlus size={10} />
                        </button>
                      </div>
                      
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#E0001B'
                      }}>
                        {formatCurrency(getItemTotal(item))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Box */}
          <div style={{
            backgroundColor: 'white',
            margin: '12px 20px',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Order Summary
            </h3>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {addonTotal > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '14px'
              }}>
                <span>Add-ons</span>
                <span>{formatCurrency(addonTotal)}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
              fontSize: '14px'
            }}>
              <span>Delivery fee</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>

            <div style={{
              borderTop: '1px solid #eee',
              paddingTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <div style={{
            padding: '20px',
            position: 'sticky',
            bottom: '60px', // Above bottom nav
            backgroundColor: '#f8f9fa'
          }}>
            <button
              onClick={handleCheckout}
              style={{
                width: '100%',
                backgroundColor: '#E0001B',
                color: 'white',
                border: 'none',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#c8001a';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#E0001B';
              }}
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;