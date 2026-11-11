import fs from 'fs';

const p = new URL('../go7 figma/components/CheckoutPage.tsx', import.meta.url);
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('getActiveUserRewards')) {
  c = c.replace(
    "import { generateDeliveryPIN } from '../../src/services/orderTracking';",
    "import { generateDeliveryPIN } from '../../src/services/orderTracking';\nimport { getActiveUserRewards, applyUserRewardToTotals, consumeUserReward } from '../../src/services/gamificationService';"
  );
}

if (!c.includes('availableRewards')) {
  c = c.replace(
    "const [distanceError, setDistanceError] = useState<string | null>(null);",
    "const [distanceError, setDistanceError] = useState<string | null>(null);\n  const [availableRewards, setAvailableRewards] = useState<any[]>([]);\n  const [selectedRewardId, setSelectedRewardId] = useState<string>('');"
  );
}

if (!c.includes('loadActiveRewards')) {
  const hook = `
  useEffect(() => {
    const loadActiveRewards = async () => {
      if (!currentUser?.uid) {
        setAvailableRewards([]);
        setSelectedRewardId('');
        return;
      }
      try {
        const rewards = await getActiveUserRewards(currentUser.uid);
        setAvailableRewards(rewards);
        if (rewards.length === 1) setSelectedRewardId(rewards[0].id);
      } catch (e) {
        console.warn('Could not load rewards:', e);
        setAvailableRewards([]);
      }
    };
    loadActiveRewards();
  }, [currentUser?.uid]);
`;
  c = c.replace(
    '  // Max delivery distance for food orders (km)',
    hook + '\n  // Max delivery distance for food orders (km)'
  );
}

const oldTotals = `  const packagingFee = giftPackaging ? 500 : 0;
  const serviceFee = settings.serviceFee.enabled ? settings.serviceFee.amount : 0;
  
  // Use dynamic delivery fee based on distance calculation (fallback to prop from cart)
  const calculatedDeliveryFee =
    selectedAddress && savedAddresses.length > 0
      ? dynamicDeliveryFee
      : deliveryFee || 0;

  const netItemTotal = Math.max(0, subtotal - itemDiscounts - promoDiscount);
  const orderPricing = buildFoodOrderPricing({
    itemTotal: netItemTotal,
    deliveryFee: calculatedDeliveryFee,
  });
  const platformFee = orderPricing.platformFee;
  const finalTotal = orderPricing.grandTotal + packagingFee + serviceFee;`;

const newTotals = `  const packagingFee = giftPackaging ? 500 : 0;
  const serviceFee = settings.serviceFee.enabled ? settings.serviceFee.amount : 0;
  
  // Use dynamic delivery fee based on distance calculation (fallback to prop from cart)
  const baseDeliveryFee =
    selectedAddress && savedAddresses.length > 0
      ? dynamicDeliveryFee
      : deliveryFee || 0;

  const netItemTotal = Math.max(0, subtotal - itemDiscounts - promoDiscount);
  const selectedReward = availableRewards.find((r) => r.id === selectedRewardId) || null;
  const rewardApplied = applyUserRewardToTotals(
    { itemTotal: netItemTotal, deliveryFee: baseDeliveryFee },
    selectedReward
  );
  const calculatedDeliveryFee = rewardApplied.deliveryFee;
  const rewardCredit = rewardApplied.rewardCredit || 0;
  const orderPricing = buildFoodOrderPricing({
    itemTotal: netItemTotal,
    deliveryFee: calculatedDeliveryFee,
  });
  const platformFee = orderPricing.platformFee;
  const finalTotal = Math.max(
    0,
    orderPricing.grandTotal + packagingFee + serviceFee - rewardCredit
  );`;

if (c.includes(oldTotals)) {
  c = c.replace(oldTotals, newTotals);
  console.log('totals block patched');
} else {
  console.log('totals block NOT found');
}

if (!c.includes('appliedRewardId')) {
  c = c.replace(
    'deliveryFee: calculatedDeliveryFee,',
    `deliveryFee: calculatedDeliveryFee,
        rewardCredit,
        appliedRewardId: selectedReward?.id || null,
        appliedRewardName: selectedReward?.rewardName || selectedReward?.name || null,
        appliedRewardType: selectedReward?.type || null,`
  );
  console.log('orderData reward fields patched');
}

if (!c.includes('consumeUserReward(selectedReward')) {
  c = c.replaceAll(
    'clearCart();',
    `if (selectedReward?.id) {
            try { await consumeUserReward(selectedReward.id, newOrder?.id); } catch (rewardErr) { console.warn('Reward consume failed:', rewardErr); }
          }
          clearCart();`
  );
  console.log('consumeUserReward hooks added');
}

const uiMarker = '{itemDiscounts > 0 && (';
if (c.includes(uiMarker) && !c.includes('Your rewards')) {
  const uiInsert = `{availableRewards.length > 0 && (
                <div className="mb-3 p-3 rounded-xl border border-green-200 bg-green-50">
                  <div className="text-sm font-medium text-gray-900 mb-2">Your rewards</div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRewardId('')}
                      className={\`w-full text-left px-3 py-2 rounded-lg text-xs \${!selectedRewardId ? 'bg-white border border-green-500 text-green-700' : 'bg-white/60 text-gray-600'}\`}
                    >
                      No reward
                    </button>
                    {availableRewards.map((reward) => (
                      <button
                        key={reward.id}
                        type="button"
                        onClick={() => setSelectedRewardId(reward.id)}
                        className={\`w-full text-left px-3 py-2 rounded-lg text-xs \${selectedRewardId === reward.id ? 'bg-white border border-green-500 text-green-700' : 'bg-white/60 text-gray-600'}\`}
                      >
                        {reward.rewardName || reward.name || reward.type}
                        {reward.type === 'free_delivery' ? ' · Free delivery' : ''}
                        {(reward.type === 'order_credit' || reward.type === 'discount') ? \` · \u20A6\${Number(reward.value || 0).toLocaleString()} off\` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {rewardCredit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Reward credit</span>
                  <span className="text-green-600">-\u20A6{rewardCredit.toLocaleString()}</span>
                </div>
              )}
              {rewardApplied.deliveryWaived && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Reward</span>
                  <span className="text-green-600">Free delivery applied</span>
                </div>
              )}
              {itemDiscounts > 0 && (`;
  c = c.replace(uiMarker, uiInsert);
  console.log('rewards UI inserted');
} else {
  console.log('rewards UI skip');
}

fs.writeFileSync(p, c);
console.log('CheckoutPage written', c.length);
