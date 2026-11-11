import fs from 'fs';

function patch(path, replacements) {
  let s = fs.readFileSync(path, 'utf8');
  for (const { label, from, to } of replacements) {
    const candidates = [from, from.replace(/\n/g, '\r\n')];
    let ok = false;
    for (const c of candidates) {
      if (s.includes(c)) {
        s = s.replace(c, to);
        ok = true;
        break;
      }
    }
    if (!ok) {
      console.error('MISSING', label, 'in', path);
      process.exit(1);
    }
    console.log('OK', label);
  }
  fs.writeFileSync(path, s);
}

patch('go7 figma/components/Go7ComboRush.tsx', [
  {
    label: 'handleAddToCart optional event',
    from: `  const handleAddToCart = (combo: Combo, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddedCombos(prev => new Set(prev).add(combo.id));
    onAddToCart?.(combo);
    
    toast.success(\`\${combo.name} added to cart\`, {
      description: \`Save ₦\${combo.savings.toLocaleString()} • ₦\${combo.comboPrice.toLocaleString()}\`,
      duration: 2000,
    });`,
    to: `  const handleAddToCart = (combo: Combo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setAddedCombos(prev => new Set(prev).add(combo.id));
    onAddToCart?.(combo);`,
  },
  {
    label: 'card click adds to cart',
    from: `                  onClick={() => onComboClick(combo)}`,
    to: `                  onClick={() => handleAddToCart(combo)}`,
  },
]);

patch('go7 figma/FigmaApp.tsx', [
  {
    label: 'combo add goes to cart',
    from: `            onAddComboToCart={(combo) => {
              const cartItem = {
                id: combo.id,
                name: combo.name,
                vendorId: combo.vendorId || combo.vendor,
                vendorName: combo.vendor,
                imageUrl: combo.image,
                price: combo.comboPrice || combo.price || 0,
                quantity: 1,
                options: {},
                optionPrices: {},
                addOns: [],
                totalPrice: combo.comboPrice || combo.price || 0
              };
              
              addToCart(cartItem);
              toast.success(\`\${combo.name} added to cart!\`);
            }}`,
    to: `            onAddComboToCart={(combo) => {
              const cartItem = {
                id: combo.id,
                name: combo.name,
                vendorId: combo.vendorId || combo.vendor,
                vendorName: combo.vendor,
                imageUrl: combo.image,
                price: combo.comboPrice || combo.price || 0,
                quantity: 1,
                options: {},
                optionPrices: {},
                addOns: [],
                totalPrice: combo.comboPrice || combo.price || 0,
                isCombo: true,
              };
              
              addToCart(cartItem);
              toast.success(\`\${combo.name} added to cart!\`);
              setCurrentScreen('cart');
            }}`,
  },
]);

console.log('Combo → cart wiring patched');
