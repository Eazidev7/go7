const admin=require('firebase-admin');admin.initializeApp({projectId:'go7-app-209e4'});const db=admin.firestore();
const NEED=/coca.?cola|coke|malta|guinness|pasta|spaghett|nylon|bread/i;
(async()=>{
 const vs=await db.collection('vendors').get();
 for(const d of vs.docs){
   const v=d.data();
   const p=await db.collection('vendors').doc(d.id).collection('products').get();
   p.forEach(x=>{const y=x.data();
     if(NEED.test(y.name||'')&&y.imageUrl)
       console.log((v.businessName||'').slice(0,22),'|',(y.name||'').slice(0,42),'|',y.imageUrl);
   });
 }
 process.exit(0)})();
