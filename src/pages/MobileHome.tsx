import MobileHomePage from '../components/MobileHomePage';
import { Helmet } from 'react-helmet-async';

const MobileHome = () => {
  console.log('🏠 MobileHome component rendering...');
  
  return (
    <>
      <Helmet>
        <title>Go7 Mobile - Food & Parcel Delivery</title>
        <meta 
          name="description" 
          content="Order food and parcels on Go7 mobile app. Fast delivery in Abeokuta." 
        />
      </Helmet>
      <MobileHomePage />
    </>
  );
};

export default MobileHome;