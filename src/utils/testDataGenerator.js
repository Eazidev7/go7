import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Test data generator for Go7 Admin Dashboard
 * Creates sample riders, orders, vendors, and payments
 */
export const generateTestData = async () => {
    try {
        console.log('🎲 Generating test data for Go7 Admin Dashboard...');

        // Sample Riders
        const riders = [
            {
                name: 'Ahmed Olamide',
                vehicle: 'Honda CB125F',
                plateNumber: 'ABJ-123-XY',
                status: 'active',
                currentLocation: {
                    latitude: 7.160427,
                    longitude: 3.347663
                },
                phone: '+234-801-234-5678',
                rating: 4.8,
                totalDeliveries: 156,
                joinedAt: serverTimestamp()
            },
            {
                name: 'Kemi Adebayo',
                vehicle: 'Yamaha YBR125',
                plateNumber: 'ABJ-456-ZW',
                status: 'delivering',
                currentLocation: {
                    latitude: 7.165430,
                    longitude: 3.350660
                },
                phone: '+234-802-345-6789',
                rating: 4.9,
                totalDeliveries: 203,
                currentOrderId: 'order123',
                joinedAt: serverTimestamp()
            },
            {
                name: 'Tunde Oke',
                vehicle: 'TVS Apache 160',
                plateNumber: 'ABJ-789-UV',
                status: 'on_break',
                currentLocation: {
                    latitude: 7.155420,
                    longitude: 3.345650
                },
                phone: '+234-803-456-7890',
                rating: 4.7,
                totalDeliveries: 98,
                joinedAt: serverTimestamp()
            }
        ];

        // Sample Vendors
        const vendors = [
            {
                name: 'Mama Put Kitchen',
                category: 'Restaurant',
                address: 'Oke-Ilewo, Abeokuta',
                phone: '+234-805-123-4567',
                rating: 4.6,
                isActive: true,
                location: {
                    latitude: 7.158427,
                    longitude: 3.349663
                },
                // Wallet data
                totalEarnings: 125000,
                availableBalance: 45000,
                pendingPayouts: 0,
                totalPayouts: 80000,
                joinedAt: serverTimestamp()
            },
            {
                name: 'Fresh Mart Grocery',
                category: 'Grocery',
                address: 'Kuto, Abeokuta',
                phone: '+234-806-234-5678',
                rating: 4.8,
                isActive: true,
                location: {
                    latitude: 7.162427,
                    longitude: 3.352663
                },
                // Wallet data
                totalEarnings: 89000,
                availableBalance: 12000,
                pendingPayouts: 15000,
                totalPayouts: 62000,
                joinedAt: serverTimestamp()
            },
            {
                name: 'TechHub Electronics',
                category: 'Electronics',
                address: 'Omida, Abeokuta',
                phone: '+234-807-345-6789',
                rating: 4.5,
                isActive: true,
                location: {
                    latitude: 7.164427,
                    longitude: 3.348663
                },
                // Wallet data
                totalEarnings: 156000,
                availableBalance: 23000,
                pendingPayouts: 25000,
                totalPayouts: 108000,
                joinedAt: serverTimestamp()
            }
        ];

        // Add riders to Firestore
        const riderIds = [];
        for (const rider of riders) {
            const riderRef = await addDoc(collection(db, 'riders'), rider);
            riderIds.push(riderRef.id);
            console.log(`✅ Added rider: ${rider.name}`);
        }

        // Add vendors to Firestore
        const vendorIds = [];
        for (const vendor of vendors) {
            const vendorRef = await addDoc(collection(db, 'vendors'), vendor);
            vendorIds.push(vendorRef.id);
            console.log(`✅ Added vendor: ${vendor.name}`);
        }

        // Create sample payout requests
        const payoutRequests = [
            {
                vendorId: vendorIds[0],
                vendorName: 'Mama Put Kitchen',
                amount: 15000,
                requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                status: 'pending',
                bankDetails: {
                    bankName: 'First Bank',
                    accountNumber: '3085943210',
                    accountName: 'Mama Put Kitchen'
                }
            },
            {
                vendorId: vendorIds[1],
                vendorName: 'Fresh Mart Grocery',
                amount: 8000,
                requestDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
                status: 'pending',
                bankDetails: {
                    bankName: 'GTBank',
                    accountNumber: '0123456789',
                    accountName: 'Fresh Mart Grocery Ltd'
                }
            },
            {
                vendorId: vendorIds[2],
                vendorName: 'TechHub Electronics',
                amount: 12000,
                requestDate: new Date(),
                status: 'approved',
                bankDetails: {
                    bankName: 'Access Bank',
                    accountNumber: '1234567890',
                    accountName: 'TechHub Electronics'
                },
                approvedBy: 'admin',
                approvedAt: new Date()
            }
        ];

        // Add payout requests to Firestore
        for (const payout of payoutRequests) {
            await addDoc(collection(db, 'payoutRequests'), payout);
            console.log(`✅ Added payout request: ${payout.vendorName} - ₦${payout.amount.toLocaleString()}`);
        }

        // Sample Orders
        const orders = [
            {
                customerName: 'Sarah Johnson',
                customerPhone: '+234-901-234-5678',
                vendorId: vendorIds[0],
                vendorName: 'Mama Put Kitchen',
                items: [
                    { name: 'Jollof Rice', quantity: 2, price: 1500 },
                    { name: 'Fried Chicken', quantity: 1, price: 1200 }
                ],
                subtotal: 4200,
                deliveryFee: 500,
                total: 4700,
                status: 'pending',
                deliveryAddress: 'Block 3, Abeokuta South LGA',
                pickupAddress: 'Oke-Ilewo, Abeokuta',
                createdAt: serverTimestamp()
            },
            {
                customerName: 'David Adeyemi',
                customerPhone: '+234-902-345-6789',
                vendorId: vendorIds[1],
                vendorName: 'Fresh Mart Grocery',
                riderId: riderIds[1],
                items: [
                    { name: 'Rice 5kg', quantity: 1, price: 3500 },
                    { name: 'Cooking Oil', quantity: 2, price: 800 }
                ],
                subtotal: 5100,
                deliveryFee: 600,
                total: 5700,
                status: 'assigned',
                deliveryAddress: 'Asero Estate, Abeokuta',
                pickupAddress: 'Kuto, Abeokuta',
                assignedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            },
            {
                customerName: 'Fatima Yusuf',
                customerPhone: '+234-903-456-7890',
                vendorId: vendorIds[2],
                vendorName: 'TechHub Electronics',
                items: [
                    { name: 'Phone Charger', quantity: 1, price: 2500 },
                    { name: 'Power Bank', quantity: 1, price: 4500 }
                ],
                subtotal: 7000,
                deliveryFee: 700,
                total: 7700,
                status: 'delivered',
                deliveryAddress: 'GRA, Abeokuta',
                pickupAddress: 'Omida, Abeokuta',
                deliveredAt: serverTimestamp(),
                createdAt: serverTimestamp()
            }
        ];

        // Add orders to Firestore
        const orderIds = [];
        for (const order of orders) {
            const orderRef = await addDoc(collection(db, 'orders'), order);
            orderIds.push(orderRef.id);
            console.log(`✅ Added order: ${order.customerName} - $${order.total}`);
        }

        // Sample Payments
        const payments = [
            {
                vendorId: vendorIds[0],
                vendorName: 'Mama Put Kitchen',
                orderId: orderIds[2],
                amount: 3290, // 70% of order total (vendor commission)
                status: 'pending',
                createdAt: serverTimestamp()
            },
            {
                vendorId: vendorIds[1],
                vendorName: 'Fresh Mart Grocery',
                orderId: orderIds[1],
                amount: 3990,
                status: 'completed',
                processedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            }
        ];

        // Add payments to Firestore
        for (const payment of payments) {
            await addDoc(collection(db, 'payments'), payment);
            console.log(`✅ Added payment: ${payment.vendorName} - $${payment.amount}`);
        }

        // Sample Wallet Transactions
        const walletTransactions = [
            // Mama Put Kitchen transactions
            {
                vendorId: vendorIds[0],
                vendorName: 'Mama Put Kitchen',
                type: 'credit',
                amount: 3500,
                description: 'Order commission - #GO7001',
                orderId: orderIds[0],
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                status: 'completed'
            },
            {
                vendorId: vendorIds[0],
                vendorName: 'Mama Put Kitchen',
                type: 'debit',
                amount: 25000,
                description: 'Payout to bank account',
                payoutId: 'payout_001',
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                status: 'completed'
            },
            {
                vendorId: vendorIds[0],
                vendorName: 'Mama Put Kitchen',
                type: 'credit',
                amount: 4200,
                description: 'Order commission - #GO7002',
                orderId: orderIds[1],
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                status: 'completed'
            },
            
            // Fresh Mart Grocery transactions
            {
                vendorId: vendorIds[1],
                vendorName: 'Fresh Mart Grocery',
                type: 'credit',
                amount: 5100,
                description: 'Order commission - #GO7003',
                orderId: orderIds[2],
                date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
                status: 'completed'
            },
            {
                vendorId: vendorIds[1],
                vendorName: 'Fresh Mart Grocery',
                type: 'debit',
                amount: 15000,
                description: 'Payout to bank account',
                payoutId: 'payout_002',
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                status: 'completed'
            },
            
            // TechHub Electronics transactions
            {
                vendorId: vendorIds[2],
                vendorName: 'TechHub Electronics',
                type: 'credit',
                amount: 7000,
                description: 'Order commission - #GO7004',
                orderId: orderIds[3],
                date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
                status: 'completed'
            },
            {
                vendorId: vendorIds[2],
                vendorName: 'TechHub Electronics',
                type: 'credit',
                amount: 2800,
                description: 'Order commission - #GO7005',
                orderId: orderIds[4],
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                status: 'completed'
            }
        ];

        // Add wallet transactions to Firestore
        for (const transaction of walletTransactions) {
            await addDoc(collection(db, 'walletTransactions'), transaction);
            console.log(`✅ Added wallet transaction: ${transaction.vendorName} - ${transaction.type} ₦${transaction.amount.toLocaleString()}`);
        }

        console.log('🎉 Test data generation completed!');
        return {
            riders: riderIds,
            vendors: vendorIds,
            orders: orderIds,
            message: 'Test data generated successfully!'
        };

    } catch (error) {
        console.error('❌ Error generating test data:', error);
        throw error;
    }
};

// Function to clear test data
export const clearTestData = async () => {
    try {
        console.log('🧹 Clearing test data...');
        
        // Note: In a real app, you'd want to be more careful about deletion
        // This is just for demo purposes
        
        console.log('⚠️ Manual deletion required - use Firebase Console to clear collections');
        return { message: 'Please manually clear collections in Firebase Console' };
        
    } catch (error) {
        console.error('❌ Error clearing test data:', error);
        throw error;
    }
};