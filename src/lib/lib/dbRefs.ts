import { collection, doc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  customerDeliveryConverter as CustomerDeliveryConverter,
  deliveryLiveConverter as DeliveryLiveConverter
} from '../types/models';

export const bookingsCol = collection(db, 'customer_deliveries').withConverter(CustomerDeliveryConverter);
export const deliveriesCol = collection(db, 'deliveries').withConverter(DeliveryLiveConverter);

export const deliveryDoc = (id: string) =>
  doc(db, 'deliveries', id).withConverter(DeliveryLiveConverter);

export const bookingDoc = (id: string) =>
  doc(db, 'customer_deliveries', id).withConverter(CustomerDeliveryConverter);
