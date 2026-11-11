// TypeScript interfaces for GO7 Chat System
// Use these types for TypeScript development

import { Timestamp } from 'firebase/firestore';

export interface ChatMetadata {
  deliveryId: string;
  participantIds: string[];
  lastMessage: string;
  lastMessageTime: Timestamp;
  lastSenderId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  messageCount: number;
}

export interface ChatMessage {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Timestamp;
  isRead: boolean;
  messageType: 'text' | 'image' | 'location' | 'system';
  
  // Optional fields
  imageUrl?: string;
  imageMetadata?: {
    fileName: string;
    fileSize: number;
    dimensions: {
      width: number;
      height: number;
    };
  };
  
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  
  systemMessageType?: 'user_joined' | 'delivery_started' | 'delivery_completed' | 'rider_assigned';
  editedAt?: Timestamp;
  deletedAt?: Timestamp;
  
  // Context
  deliveryId: string;
  deliveryStatus?: string;
  
  // Metadata
  platform: 'web' | 'android' | 'ios';
  userAgent?: string;
  messageVersion: number;
}

export interface ChatParticipant {
  activeChats: string[];
  totalMessages: number;
  lastActive: Timestamp;
  fcmToken?: string;
  notificationSettings: {
    chatMessages: boolean;
    deliveryUpdates: boolean;
    soundEnabled: boolean;
  };
}

export interface DeliveryReference {
  customerId: string;
  riderId: string;
  status: string;
  chatEnabled: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  role: 'customer' | 'rider' | 'admin';
  fcmToken?: string;
  isOnline: boolean;
  lastSeen: Timestamp;
}