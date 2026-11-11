const admin=require('firebase-admin');admin.initializeApp({projectId:'go7-app-209e4'});const db=admin.firestore();
(async()=>{
 const v=await db.collection('vendors').doc('VnVVHfdjQGP9qDUTgsOC').get();
 const d=v.data();
 console.log('vendor:',d.businessName,'| status:',d.status,'| isLive:',d.isLive,'| canReceiveOrders:',d.canReceiveOrders,'| type:',d.vendorType,'| cats:',JSON.stringify(d.categories),'| coords:',d.coordinates.lat,d.coordinates.lng);
 const p=await db.collection('vendors').doc('VnVVHfdjQGP9qDUTgsOC').collection('products').get();
 console.log('products:',p.size);
 p.forEach(x=>{const y=x.data();console.log(' -',y.name,'₦'+y.basePrice,'|',y.categoryName,'| avail:',y.isAvailable)});
 const m=await db.collection('products').where('vendorId','==','VnVVHfdjQGP9qDUTgsOC').get();
 console.log('top-level mirror docs:',m.size);
 process.exit(0)})();
