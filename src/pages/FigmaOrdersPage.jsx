import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { OrdersPage } from '../../go7 figma/components/OrdersPage';
import { FigmaProviders } from '../components/FigmaProviders';

const TRACKABLE_STATUSES = [
  'preparing',
  'on-the-way',
  'picked-up',
  'in-transit',
  'pending',
  'confirmed',
  'ready',
  'finding_shopper',
  'shopping',
  'shopper_assigned',
  'shopper-assigned',
  'on_the_way',
  'assigned',
  'accepted',
  'enroute',
  'in_transit',
  'delivered',
];

export default function FigmaOrdersPage() {
  const navigate = useNavigate();

  return (
    <FigmaProviders>
      <OrdersPage
        onBack={() => navigate('/')}
        onOrderClick={(order) => {
          const id = order.id || order.orderId || order.bookingId;
          if (id && TRACKABLE_STATUSES.includes(order.status)) {
            navigate(`/track-order/${encodeURIComponent(id)}`);
            return;
          }
          toast.info('Order details', {
            description: `${order.orderNumber || id || 'Order'} — ${order.status || 'status unknown'}`,
          });
        }}
      />
    </FigmaProviders>
  );
}
