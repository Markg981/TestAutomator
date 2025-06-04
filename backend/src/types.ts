// Base user interface with common properties
export interface BaseUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

// Interface for stored users (includes password)
export interface StoredUser extends BaseUser {
  password: string; // Required for stored users
}

// Interface for public users (no password)
export interface User extends BaseUser {
  password?: never; // Ensure password is never included
} 