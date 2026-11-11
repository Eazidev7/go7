const admin=require('firebase-admin');admin.initializeApp({projectId:'go7-app-209e4'});const db=admin.firestore();
(async()=>{
 // 1) full vendor doc for Lami Foods (groceries at Camp junction)
 const v=await db.collection('vendors').doc('6GpUrJPqHzQNLzuiyQ8YpHwjdZo2').get();
 console.log('=== VENDOR LAMI ===');console.log(JSON.stringify(v.data(),null,1));
 // 2) where do products live? check subcollection + top-level
 const sub=await db.collection('vendors').doc('6GpUrJPqHzQNLzuiyQ8YpHwjdZo2').collection('products').limit(2).get();
 console.log('=== SUBCOLLECTION products:',sub.size);sub.forEach(d=>console.log(JSON.stringify(d.data(),null,1).slice(0,1500)));
 const top=await db.collection('products').where('vendorId','==','6GpUrJPqHzQNLzuiyQ8YpHwjdZo2').limit(2).get();
 console.log('=== TOP-LEVEL products:',top.size);top.forEach(d=>console.log(d.id,JSON.stringify(d.data(),null,1).slice(0,1500)));
 process.exit(0)})();
