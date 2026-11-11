// This file contains type declarations for JSX components used in TypeScript files

// Component declarations for different import paths
declare module '../components/HomePage' {
  import { FC } from 'react';
  const HomePage: FC<any>;
  export default HomePage;
}

declare module '../components/HomePage.jsx' {
  import { FC } from 'react';
  const HomePage: FC<any>;
  export default HomePage;
}

declare module '../components/MobileHomePage' {
  import { FC } from 'react';
  const MobileHomePage: FC<any>;
  export default MobileHomePage;
}

declare module '../components/MobileHomePage.jsx' {
  import { FC } from 'react';
  const MobileHomePage: FC<any>;
  export default MobileHomePage;
}

// Modal component declarations
declare module '../../components/modals/CustomerToast' {
  import { FC } from 'react';
  const CustomerToast: FC<any>;
  export default CustomerToast;
}

declare module '../../components/modals/CustomerToast.jsx' {
  import { FC } from 'react';
  const CustomerToast: FC<any>;
  export default CustomerToast;
}

declare module '../../components/modals/RiderOrderModal' {
  import { FC } from 'react';
  const RiderOrderModal: FC<any>;
  export default RiderOrderModal;
}

declare module '../../components/modals/RiderOrderModal.jsx' {
  import { FC } from 'react';
  const RiderOrderModal: FC<any>;
  export default RiderOrderModal;
}

// Services declarations
declare module '../../services/NotificationService' {
  const NotificationService: any;
  export default NotificationService;
}

declare module '../../services/NotificationService.js' {
  const NotificationService: any;
  export default NotificationService;
}