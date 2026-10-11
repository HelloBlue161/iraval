// Data models matching the Iraval iOS app

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  birthDate: string;
  zipCode: string;
  city: string;
  profileImageURL?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverImageURL?: string;
  addedBy: string;
  addedAt: string;
  bookStatus?: 'available' | 'borrowed' | 'lent' | 'pending_exchange';
  lentTo?: string; // UID of the borrower while bookStatus === 'lent'
  language?: string;
}

export const LANGUAGES = [
  'English',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Hindi',
  'Other',
] as const;

export interface BookSearchResult {
  key: string;
  title: string;
  author: string;
  coverImageURL?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  sentAt: Date;
}

export type FriendRequestStatus = 'none' | 'pending' | 'accepted' | 'declined';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

export type ExchangeStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Exchange {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverImageURL?: string;
  senderId: string;
  receiverId: string;
  status: ExchangeStatus;
  requestedAt: Date;
  respondedAt?: Date;
  note?: string;
  declineNote?: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export const ZIP_CITY_MAP: Record<string, string> = {
  '10001': 'New York',
  '90210': 'Beverly Hills',
  '33101': 'Miami',
  '60601': 'Chicago',
  '75201': 'Dallas',
  '30301': 'Atlanta',
  '85001': 'Phoenix',
  '19101': 'Philadelphia',
  '77001': 'Houston',
  '94101': 'San Francisco',
};

// Approximate lat/lng for common zip codes (for distance calculation)
export const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  '10001': { lat: 40.7505, lng: -73.9934 },
  '90210': { lat: 34.0901, lng: -118.4065 },
  '33101': { lat: 25.7742, lng: -80.1936 },
  '60601': { lat: 41.8781, lng: -87.6298 },
  '75201': { lat: 32.7767, lng: -96.7970 },
  '30301': { lat: 33.7490, lng: -84.3880 },
  '85001': { lat: 33.4484, lng: -112.0740 },
  '19101': { lat: 39.9526, lng: -75.1652 },
  '77001': { lat: 29.7604, lng: -95.3698 },
  '94101': { lat: 37.7749, lng: -122.4194 },
};

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
