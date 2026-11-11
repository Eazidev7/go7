// ==========================================================
// GO7 FOOD CATEGORY ICONS – Professional SVG Components
// Updated: Oct 15, 2025 - Triple Cheeseburger v2.0
// ==========================================================

import React from 'react';

// 🍔 NEW Triple Cheeseburger Icon (Enhanced Detailed Burger v2)
export const BurgerIcon = ({ size = 32, color = "#E60023" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* UPDATED Top Bun */}
        <ellipse cx="32" cy="14" rx="25" ry="10" fill="#8B4513" />
        <ellipse cx="32" cy="14" rx="25" ry="8" fill="#D2691E" />
        <ellipse cx="32" cy="14" rx="24" ry="6" fill="#DEB887" />

        {/* Big Sesame Seeds */}
        <circle cx="18" cy="12" r="1.5" fill="#FFFACD" />
        <circle cx="25" cy="10" r="1.5" fill="#FFFACD" />
        <circle cx="32" cy="9" r="1.5" fill="#FFFACD" />
        <circle cx="39" cy="10" r="1.5" fill="#FFFACD" />
        <circle cx="46" cy="12" r="1.5" fill="#FFFACD" />
        <circle cx="22" cy="14" r="1.2" fill="#FFF8DC" />
        <circle cx="35" cy="13" r="1.2" fill="#FFF8DC" />
        <circle cx="42" cy="15" r="1.2" fill="#FFF8DC" />

        {/* Crispy Lettuce */}
        <path d="M8 24 Q6 26 8 29 L56 29 Q58 26 56 24 Z" fill="#90EE90" />
        <path d="M8 24 L56 24 L54 27 L10 27 Z" fill="#7CCD7C" opacity="0.6" />
        <path d="M10 27 Q12 28 14 27 L50 27 Q52 28 54 27" stroke="#6B8E23" strokeWidth="0.5" fill="none" />

        {/* Juicy Tomato */}
        <ellipse cx="32" cy="33" rx="23" ry="4" fill="#FF6347" />
        <ellipse cx="32" cy="33" rx="21" ry="2.5" fill="#FF4500" opacity="0.4" />
        <ellipse cx="32" cy="32" rx="19" ry="1.5" fill="#FF7F50" opacity="0.3" />

        {/* Melted Cheese 1 */}
        <path d="M10 37 L54 37 L52 41 L12 41 Z" fill="#FFD700" />
        <path d="M10 37 L54 37 L54 38 L10 38 Z" fill="#FFA500" opacity="0.5" />
        <ellipse cx="32" cy="39" rx="20" ry="1" fill="#DAA520" opacity="0.3" />

        {/* Beef Patty 1 (Red Theme) */}
        <ellipse cx="32" cy="44" rx="24" ry="5" fill={color} />
        <ellipse cx="32" cy="44" rx="24" ry="4" fill="#8B4513" />
        <ellipse cx="32" cy="43" rx="22" ry="2" fill="#A0522D" opacity="0.5" />
        <path d="M10 44 Q32 46 54 44" stroke="#6B3410" strokeWidth="0.5" fill="none" />

        {/* Melted Cheese 2 */}
        <path d="M9 48 L55 48 L53 52 L11 52 Z" fill="#FFD700" />
        <path d="M9 48 L55 48 L55 49 L9 49 Z" fill="#FFA500" opacity="0.5" />

        {/* Beef Patty 2 (Red Theme) */}
        <ellipse cx="32" cy="55" rx="24" ry="5" fill={color} />
        <ellipse cx="32" cy="55" rx="24" ry="4" fill="#8B4513" />
        <ellipse cx="32" cy="54" rx="22" ry="2" fill="#A0522D" opacity="0.5" />

        {/* Melted Cheese 3 */}
        <path d="M10 58 L54 58 L52 61 L12 61 Z" fill="#FFD700" />

        {/* Bottom Bun */}
        <ellipse cx="32" cy="62" rx="25" ry="6" fill="#DEB887" />
        <ellipse cx="32" cy="62" rx="23" ry="4" fill="#D2B48C" />
        <ellipse cx="32" cy="61" rx="21" ry="2" fill="#C4A672" opacity="0.4" />
    </svg>
);

// 🍕 Pizza Icon
export const PizzaIcon = ({ size = 32, color = "#E60023" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Pizza Slice Base */}
        <path d="M32 8L52 52H12L32 8Z" fill="#FFD700" />
        {/* Cheese */}
        <path d="M32 12L48 48H16L32 12Z" fill="#FFA500" />
        {/* Crust Edge */}
        <path d="M12 52C12 52 16 48 22 48C28 48 36 48 42 48C48 48 52 52 52 52H12Z" fill="#D2691E" />
        {/* Pepperoni 1 */}
        <circle cx="26" cy="28" r="4" fill={color} />
        <circle cx="26" cy="28" r="4" fill="#8B0000" opacity="0.3" />
        {/* Pepperoni 2 */}
        <circle cx="38" cy="30" r="4" fill={color} />
        <circle cx="38" cy="30" r="4" fill="#8B0000" opacity="0.3" />
        {/* Pepperoni 3 */}
        <circle cx="28" cy="40" r="3.5" fill={color} />
        <circle cx="28" cy="40" r="3.5" fill="#8B0000" opacity="0.3" />
        {/* Pepperoni 4 */}
        <circle cx="36" cy="42" r="3.5" fill={color} />
        <circle cx="36" cy="42" r="3.5" fill="#8B0000" opacity="0.3" />
        {/* Cheese Drips */}
        <circle cx="20" cy="35" r="2" fill="#FFF8DC" />
        <circle cx="32" cy="24" r="2" fill="#FFF8DC" />
        <circle cx="42" cy="38" r="2" fill="#FFF8DC" />
    </svg>
);

// 🥗 Salad Icon
export const SaladIcon = ({ size = 32, color = "#10B981" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Bowl */}
        <path d="M12 30H52C54 30 56 32 56 34V42C56 46 54 50 50 52H14C10 50 8 46 8 42V34C8 32 10 30 12 30Z" fill="#F5F5F5" stroke="#D1D5DB" strokeWidth="2" />
        {/* Lettuce Leaves */}
        <ellipse cx="20" cy="28" rx="6" ry="8" fill={color} opacity="0.8" />
        <ellipse cx="28" cy="26" rx="7" ry="9" fill={color} opacity="0.9" />
        <ellipse cx="36" cy="27" rx="6" ry="8" fill={color} opacity="0.85" />
        <ellipse cx="44" cy="28" rx="6" ry="8" fill={color} opacity="0.8" />
        {/* Tomato Slices */}
        <circle cx="24" cy="36" r="4" fill="#FF6347" />
        <circle cx="40" cy="38" r="4" fill="#FF6347" />
        {/* Cucumber */}
        <ellipse cx="30" cy="40" rx="5" ry="3" fill="#90EE90" />
        {/* Carrot */}
        <path d="M34 34L38 36L36 38L32 36L34 34Z" fill="#FFA500" />
        {/* Onion Rings */}
        <circle cx="18" cy="40" r="3" fill="transparent" stroke="#E0D5E8" strokeWidth="1.5" />
        <circle cx="46" cy="42" r="3" fill="transparent" stroke="#E0D5E8" strokeWidth="1.5" />
    </svg>
);

// 🍣 Sushi Icon
export const SushiIcon = ({ size = 32, color = "#E60023" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sushi Roll Base */}
        <ellipse cx="32" cy="40" rx="22" ry="14" fill="#F5F5F5" />
        {/* Nori (Seaweed) Wrap */}
        <rect x="10" y="30" width="44" height="6" rx="1" fill="#2C3E2C" />
        {/* Rice Top */}
        <ellipse cx="32" cy="30" rx="22" ry="8" fill="#FFFFFF" />
        <ellipse cx="32" cy="30" rx="22" ry="6" fill="#F8F8F8" />
        {/* Rice Texture */}
        <circle cx="20" cy="28" r="1" fill="#F0F0F0" opacity="0.5" />
        <circle cx="26" cy="30" r="1" fill="#F0F0F0" opacity="0.5" />
        <circle cx="32" cy="29" r="1" fill="#F0F0F0" opacity="0.5" />
        <circle cx="38" cy="31" r="1" fill="#F0F0F0" opacity="0.5" />
        <circle cx="44" cy="29" r="1" fill="#F0F0F0" opacity="0.5" />
        {/* Salmon/Tuna Filling */}
        <ellipse cx="32" cy="24" rx="18" ry="4" fill="#FF6B6B" />
        <ellipse cx="32" cy="24" rx="18" ry="2" fill={color} opacity="0.8" />
        {/* Avocado */}
        <ellipse cx="26" cy="22" rx="4" ry="2" fill="#90EE90" />
        <ellipse cx="38" cy="22" rx="4" ry="2" fill="#90EE90" />
        {/* Cucumber Strip */}
        <rect x="30" y="20" width="4" height="3" rx="1" fill="#7CFC00" />
    </svg>
);

// 🛒 Market/Grocery Icon
export const MarketIcon = ({ size = 32, color = "#F59E0B" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shopping Basket */}
        <path d="M14 28L10 52C10 54 11 56 13 56H51C53 56 54 54 54 52L50 28H14Z" fill="#FFA500" stroke="#FF8C00" strokeWidth="2" />
        {/* Basket Weave Pattern */}
        <line x1="18" y1="32" x2="18" y2="52" stroke="#FF8C00" strokeWidth="1" opacity="0.5" />
        <line x1="26" y1="32" x2="26" y2="52" stroke="#FF8C00" strokeWidth="1" opacity="0.5" />
        <line x1="34" y1="32" x2="34" y2="52" stroke="#FF8C00" strokeWidth="1" opacity="0.5" />
        <line x1="42" y1="32" x2="42" y2="52" stroke="#FF8C00" strokeWidth="1" opacity="0.5" />
        <line x1="46" y1="32" x2="46" y2="52" stroke="#FF8C00" strokeWidth="1" opacity="0.5" />
        {/* Apple */}
        <circle cx="22" cy="20" r="6" fill="#FF0000" />
        <path d="M22 14L22 18" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
        <path d="M24 15C24 15 26 14 26 16" stroke="#228B22" strokeWidth="1.5" fill="none" />
        {/* Banana */}
        <path d="M32 16C32 16 28 18 28 22C28 26 30 24 32 24C34 24 36 26 36 22C36 18 32 16 32 16Z" fill="#FFD700" />
        <path d="M32 16C32 16 30 17 30 20" stroke="#DAA520" strokeWidth="1" fill="none" />
        {/* Orange */}
        <circle cx="42" cy="20" r="6" fill="#FFA500" />
        <circle cx="42" cy="18" r="1.5" fill="#FF8C00" />
        <path d="M42 14L42 18" stroke="#8B4513" strokeWidth="1.5" strokeLinecap="round" />
        {/* Carrot in Basket */}
        <path d="M20 40L18 48" stroke="#FF6347" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 38C20 38 21 36 22 36C23 36 24 38 24 38" stroke="#228B22" strokeWidth="2" fill="none" />
        {/* Broccoli in Basket */}
        <circle cx="44" cy="42" r="4" fill="#228B22" />
        <circle cx="42" cy="40" r="3" fill="#228B22" />
        <circle cx="46" cy="40" r="3" fill="#228B22" />
        <path d="M44 46L44 48" stroke="#90EE90" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// 💊 Pharmacy Icon
export const PharmacyIcon = ({ size = 32, color = "#EF4444" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Medical Cross Background */}
        <rect x="16" y="12" width="32" height="40" rx="4" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="2" />
        {/* Red Cross */}
        <rect x="28" y="20" width="8" height="24" rx="1" fill={color} />
        <rect x="20" y="28" width="24" height="8" rx="1" fill={color} />
        {/* Pill Bottle on Left */}
        <rect x="8" y="36" width="12" height="18" rx="2" fill="#10B981" />
        <rect x="8" y="36" width="12" height="4" rx="1" fill="#059669" />
        <circle cx="14" cy="44" r="1.5" fill="#FFFFFF" />
        <circle cx="14" cy="48" r="1.5" fill="#FFFFFF" />
        {/* Capsule on Right */}
        <ellipse cx="50" cy="40" rx="5" ry="8" fill="#3B82F6" />
        <ellipse cx="50" cy="44" rx="5" ry="4" fill="#60A5FA" />
        {/* Medicine Tablets */}
        <circle cx="32" cy="18" r="2" fill="#FFFFFF" stroke={color} strokeWidth="1" />
        <circle cx="38" cy="18" r="2" fill="#FFFFFF" stroke={color} strokeWidth="1" />
        <circle cx="26" cy="18" r="2" fill="#FFFFFF" stroke={color} strokeWidth="1" />
    </svg>
);

// 📦 Package/Delivery Icon
export const PackageIcon = ({ size = 32, color = "#E60023" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Box Base */}
        <path d="M12 24L32 12L52 24V48L32 60L12 48V24Z" fill="#FFA500" />
        {/* Box Top Face */}
        <path d="M32 12L52 24L32 36L12 24L32 12Z" fill="#FFD700" />
        {/* Box Left Face */}
        <path d="M12 24L32 36V60L12 48V24Z" fill="#FF8C00" />
        {/* Box Right Face */}
        <path d="M32 36L52 24V48L32 60V36Z" fill="#FFA500" />
        {/* Tape Lines */}
        <path d="M32 12V60" stroke={color} strokeWidth="3" />
        <path d="M12 24L52 24" stroke={color} strokeWidth="3" />
        {/* Fragile Icon */}
        <circle cx="32" cy="44" r="6" fill="transparent" stroke="#FFFFFF" strokeWidth="2" />
        <path d="M32 40V44M32 46V47" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// ⛽ Fuel/CNG Icon
export const FuelIcon = ({ size = 32, color = "#E53935" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Fuel Pump Base */}
        <rect x="20" y="32" width="24" height="24" rx="4" fill="#FFA500" stroke="#FF8C00" strokeWidth="2" />
        {/* Fuel Pump Top */}
        <rect x="24" y="20" width="16" height="14" rx="2" fill="#FFD700" stroke="#FF8C00" strokeWidth="2" />
        {/* Fuel Nozzle */}
        <path d="M40 34L52 28L52 40L40 46Z" fill="#D3D3D3" stroke="#999999" strokeWidth="2" />
        {/* Fuel Nozzle Tip */}
        <ellipse cx="52" cy="37" rx="3" ry="4" fill="#A0A0A0" />
        {/* Fuel Gauge */}
        <circle cx="32" cy="26" r="5" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1.5" />
        <path d="M32 26L32 22" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M32 26L36 24" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {/* Fuel Drop */}
        <circle cx="44" cy="18" r="2" fill="#3B82F6" />
        <path d="M44 18L44 20" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        {/* Pump Handle */}
        <rect x="26" y="14" width="12" height="8" rx="2" fill="#E53935" />
        <circle cx="32" cy="18" r="2" fill="#FFFFFF" />
    </svg>
);

// Export all icons as a collection
export const CategoryIcons = {
    burger: BurgerIcon,
    pizza: PizzaIcon,
    salad: SaladIcon,
    sushi: SushiIcon,
    market: MarketIcon,
    pharmacy: PharmacyIcon,
    package: PackageIcon,
    fuel: FuelIcon
};

export default CategoryIcons;
