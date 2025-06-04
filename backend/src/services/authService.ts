import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, StoredUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

// In una vera applicazione, questi dati sarebbero in un database
const users: StoredUser[] = [
  {
    id: '1',
    username: 'admin',
    password: bcrypt.hashSync('admin', SALT_ROUNDS),
    email: 'admin@testautomator.com',
    role: 'admin',
    createdAt: new Date().toISOString()
  }
];

export class AuthService {
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = users.find(u => u.username === username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    // Non inviamo la password al client
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  generateToken(user: StoredUser | User): string {
    if ('password' in user) {
      const { password: _, ...userWithoutPassword } = user;
      return jwt.sign(userWithoutPassword, JWT_SECRET, { expiresIn: '24h' });
    }
    return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
  }

  verifyToken(token: string): User | null {
    try {
      return jwt.verify(token, JWT_SECRET) as User;
    } catch (error) {
      return null;
    }
  }

  async getCurrentUser(token: string): Promise<User | null> {
    const decoded = this.verifyToken(token);
    if (!decoded) return null;

    const user = users.find(u => u.id === decoded.id);
    if (!user) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
} 