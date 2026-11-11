const admin=require('firebase-admin');admin.initializeApp({projectId:'go7-app-209e4'});const db=admin.firestore();
const now=admin.firestore.FieldValue.serverTimestamp();
const COORDS={latitude:7.187722699999999,longitude:3.436464,lng:3.436464,lat:7.187722699999999};
(async()=>{
 const ref=db.collection('vendors').doc();
 const vendorId=ref.id;
 await ref.set({
  businessName:'Bokku Mart',
  displayName:'Bokku Mart',
  name:'',
  vendorId,userId:vendorId,
  type:'Supermarket',vendorType:'groceries',businessType:'groceries',
  categories:['groceries','supermarket'],
  status:'approved',approved:true,approvedAt:now,approvedBy:'M8Gol8PxRJbvhVincONS8FJRdFE3',
  isActive:true,active:true,isLive:true,isOnline:false,canReceiveOrders:true,isTemporarilyClosed:false,
  accountStatus:'active',registrationComplete:true,phoneVerified:true,walletInitialized:true,
  phoneVerificationRequired:false,mustVerifyPhone:false,autoAccept:false,hasFirstOrder:false,
  description:"Nigeria's hard discount store — groceries, fresh Bokku bread and everyday essentials.",
  address:'Camp Junction, Abeokuta',
  coordinates:COORDS,
  location:{address:'Camp Junction, Abeokuta',coordinates:COORDS,source:'landmark',landmark:'Camp junction, FUNAAB'},
  landmark:'Camp junction, FUNAAB',locationSource:'landmark',locationUpdatedBy:'admin_manual',locationUpdatedAt:now,
  availableHours:{start:'09:00',end:'21:00'},
  availableDays:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  deliveryTime:'30-45 mins',deliveryFee:200,commissionRate:0.08,
  availableBalance:0,pendingPayout:0,totalEarnings:0,totalPaidOut:0,totalOrders:0,totalProducts:8,
  bankDetails:null,
  lastModifiedBy:'Admin',source:'admin-manual',
  createdAt:now,updatedAt:now
 });
 const prods=[
  {name:'Bokku Bread Signature Loaf (800g-900g)',basePrice:1100,categoryName:'Bakery'},
  {name:'Indomie Chicken Noodles 70g',basePrice:250,categoryName:'Pantry'},
  {name:'Coca-Cola Bottle 50cl',basePrice:380,categoryName:'Drinks'},
  {name:'Malta Guinness Can 33cl',basePrice:500,categoryName:'Drinks'},
  {name:'Golden Penny Pasta 500g',basePrice:950,categoryName:'Pantry'},
  {name:'Golden Penny Semovita 1kg',basePrice:1550,categoryName:'Pantry'},
  {name:'Big Bull Parboiled Rice 25kg',basePrice:29000,categoryName:'Pantry'},
  {name:'Big Bull Parboiled Rice 50kg',basePrice:57000,categoryName:'Pantry'},
 ];
 const batch=db.batch();
 for(const p of prods){
   const pr=ref.collection('products').doc();
   batch.set(pr,{name:p.name,description:'',basePrice:p.basePrice,price:p.basePrice,
    category:'grocery',categoryId:'kfEVCP27uKVGWRWtk2nX',categoryName:p.categoryName,
    measurementType:'unit',minQty:1,maxQty:20,stock:0,addons:[],
    vendorId,isAvailable:true,available:true,isActive:true,active:true,
    source:'admin-manual',needsPriceUpdate:false,createdAt:now,updatedAt:now});
 }
 await batch.commit();
 console.log('VENDOR_ID',vendorId);
 console.log('products written:',prods.length);
 process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
