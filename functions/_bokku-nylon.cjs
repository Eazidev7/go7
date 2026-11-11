const admin=require('firebase-admin');admin.initializeApp({projectId:'go7-app-209e4'});const db=admin.firestore();
const now=admin.firestore.FieldValue.serverTimestamp();
(async()=>{
 const ref=db.collection('vendors').doc('VnVVHfdjQGP9qDUTgsOC');
 const pr=ref.collection('products').doc();
 await pr.set({name:'Nylon (shopping bag)',description:'',basePrice:250,price:250,
  category:'grocery',categoryId:'kfEVCP27uKVGWRWtk2nX',categoryName:'Household',
  measurementType:'unit',minQty:1,maxQty:20,stock:0,addons:[],
  vendorId:'VnVVHfdjQGP9qDUTgsOC',isAvailable:true,available:true,isActive:true,active:true,
  source:'admin-manual',needsPriceUpdate:false,createdAt:now,updatedAt:now});
 await ref.update({totalProducts:9,updatedAt:now});
 const all=await ref.collection('products').get();
 all.forEach(d=>console.log(d.id,'|',d.data().name));
 process.exit(0)})();
