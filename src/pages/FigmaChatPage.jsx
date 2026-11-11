import React from 'react';
import CustomerChatInboxPage from './CustomerChatInboxPage';
import { FigmaProviders } from '../components/FigmaProviders';

export default function FigmaChatPage() {
  return (
    <FigmaProviders includeAuth>
      <CustomerChatInboxPage />
    </FigmaProviders>
  );
}
