import { Request, Response, NextFunction } from 'express';
import { createUserSupabaseClient } from '../services/supabase';
import { ApiResponse } from '../types/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'member' | 'group_leader';
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Access token required'
      };
      res.status(401).json(response);
      return;
    }

    // Create user-specific Supabase client
    const userSupabase = createUserSupabaseClient(token);
    
    // Get user from token
    const { data: { user }, error } = await userSupabase.auth.getUser();
    
    if (error || !user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid access token'
      };
      res.status(401).json(response);
      return;
    }

    // Get user profile for role information
    const { data: profile, error: profileError } = await userSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User profile not found'
      };
      res.status(404).json(response);
      return;
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Authentication failed'
    };
    res.status(500).json(response);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Authentication required'
      };
      res.status(401).json(response);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Insufficient permissions'
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireAdminOrGroupLeader = requireRole(['admin', 'group_leader']);
