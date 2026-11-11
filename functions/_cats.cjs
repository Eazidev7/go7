const admin=require('firebase-admin');admin.initializeApp({projectId:'go7-app-209e4'});const db=admin.firestore();
(async()=>{
 const c=await db.collection('categories').get();
 console.log('== categories ==');c.forEach(d=>console.log(d.id,'|',JSON.stringify(d.data()).slice(0,200)));
 // a groceries product example
 const vs=await db.collection('vendors').where('vendorType','==','groceries').get();
 for(const d of vs.docs){
   const p=await db.collection('vendors').doc(d.id).collection('products').limit(2).get();
   if(!p.empty){console.log('== products for',d.data().businessName);p.forEach(x=>console.log(JSON.stringify(x.data()).slice(0,700)));break;}
 }
 process.exit(0)})();
