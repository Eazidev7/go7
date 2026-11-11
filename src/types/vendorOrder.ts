export type VendorOrderStatus = 'new' | 'accepted' | 'ready' | 'picked_up' | 'completed' | 'cancelled' | 'delivered' | 'delivery_scheduled';

export interface VendorOrderItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  variants?: Record<string, string>;
  notes?: string;
  imageUrl?: string;
}

export interface VendorOrderCustomer {
  uid: string;
  name: string;
  phone: string;
  email?: string;
}

export interface VendorOrderTotals {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  discount?: number;
}

export interface VendorOrder {
  id: string;
  vendorId: string;
  customerId: string;
  customer: VendorOrderCustomer;
  items: VendorOrderItem[];
  totals: VendorOrderTotals;
  status: VendorOrderStatus;
  pickupNotes?: string;
  estimatedPickupTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  readyAt?: Date;
  pickedUpAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  actor?: 'customer' | 'vendor' | 'admin';
}

export interface VendorOrderEvent {
  id: string;
  orderId: string;
  type: 'created' | 'accepted' | 'declined' | 'ready' | 'picked_up' | 'completed' | 'cancelled' | 'delivery_scheduled' | 'new' | 'delivered';
  actor: 'customer' | 'vendor' | 'admin';
  actorId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  message?: string;
}

export interface VendorOrderFilters {
  status: VendorOrderStatus | 'all';
  dateRange: 'today' | 'week' | 'month' | 'all';
  search: string;
}

export interface VendorOrderStats {
  total: number;
  new: number;
  accepted: number;
  ready: number;
  completed: number;
  cancelled: number;
}

// Helper functions for order status
export const getOrderStatusColor = (status: VendorOrderStatus): string => {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-800';
    case 'accepted':
      return 'bg-yellow-100 text-yellow-800';
    case 'ready':
      return 'bg-green-100 text-green-800';
    case 'picked_up':
      return 'bg-purple-100 text-purple-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getOrderStatusLabel = (status: VendorOrderStatus): string => {
  switch (status) {
    case 'new':
      return 'New Order';
    case 'accepted':
      return 'Accepted';
    case 'ready':
      return 'Ready for Pickup';
    case 'picked_up':
      return 'Picked Up';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

export const getNextOrderActions = (status: VendorOrderStatus): string[] => {
  switch (status) {
    case 'new':
      return ['accept', 'decline'];
    case 'accepted':
      return ['mark_ready'];
    case 'ready':
      return ['mark_picked_up'];
    case 'picked_up':
      return ['complete'];
    default:
      return [];
  }
};
