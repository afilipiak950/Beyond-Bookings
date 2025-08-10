import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// Simple session-based authentication
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        firstName?: string;
        lastName?: string;
      };
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.userId = undefined;
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Admin authorization middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
};

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}