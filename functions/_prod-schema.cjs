const admin=require('firebase-admin');admin.initializeApp({projectId:'go7-app-209e4'});const db=admin.firestore();
(async()=>{
 const vs=await db.collection('vendors').get();
 for(const d of vs.docs){
   const p=await db.collection('vendors').doc(d.id).collection('products').limit(1).get();
   if(!p.empty){
     console.log('VENDOR:',d.data().businessName,'|',d.id,'| type:',d.data().vendorType||d.data().type);
     p.forEach(x=>console.log(JSON.stringify(x.data(),null,1)));
     process.exit(0);
   }
 }
 console.log('none found');process.exit(0)})();
