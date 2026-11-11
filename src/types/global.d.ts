// Global TypeScript declarations for the Go7 project

// Window object augmentation for Firebase recaptcha
interface Window {
  recaptchaVerifier: any;
}

// For Firebase authentication
interface RecaptchaVerifier {
  clear(): void;
  render(): Promise<number>;
  verify(): Promise<string>;
}

// Wildcard declarations for common import patterns
declare module '*/lib/firebase' {
  import { FirebaseApp } from 'firebase/app';
  import { Firestore } from 'firebase/firestore';
  import { Auth } from 'firebase/auth';
  import { FirebaseStorage } from 'firebase/storage';
  import { Functions } from 'firebase/functions';

  export const app: FirebaseApp;
  export const db: Firestore;
  export const auth: Auth;
  export const storage: FirebaseStorage;
  export const functions: Functions;
}

// Component declarations
declare module '*/components/Footer' {
  const Footer: React.ComponentType<any>;
  export default Footer;
}

// CSS module declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}