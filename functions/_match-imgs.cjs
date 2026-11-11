const admin=require('firebase-admin');admin.initializeApp({projectId:'go7-app-209e4'});const db=admin.firestore();
const NEED=/indomie|coca.?cola|coke|malta|golden.?penny|semovita|semo|big.?bull|pasta|spaghett|nylon|bread/i;
(async()=>{
 const vs=await db.collection('vendors').get();
 for(const d of vs.docs){
   const v=d.data();
   if(!/justrite|super|market|grocer/i.test((v.businessName||'')+(v.vendorType||'')))continue;
   const p=await db.collection('vendors').doc(d.id).collection('products').get();
   p.forEach(x=>{const y=x.data();
     if(NEED.test(y.name||'')&&y.imageUrl)
       console.log((v.businessName||'').slice(0,20),'|',(y.name||'').slice(0,45),'|',y.imageUrl.slice(0,110));
   });
 }
 process.exit(0)})();
