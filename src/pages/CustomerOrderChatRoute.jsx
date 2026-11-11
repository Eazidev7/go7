import React from 'react';
import CustomerOrderChatPage from './CustomerOrderChatPage';
import { FigmaProviders } from '../components/FigmaProviders';

export default function CustomerOrderChatRoute() {
  return (
    <FigmaProviders includeAuth>
      <CustomerOrderChatPage />
    </FigmaProviders>
  );
}
