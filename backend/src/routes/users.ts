import { Router, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { supabase } from '../services/supabase';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { 
  UserProfile, 
  CreateUserProfileRequest, 
  UpdateUserProfileRequest, 
  ApiResponse, 
  PaginationParams 
} from '../types/database';

const router = Router();

// Validation rules
const createUserValidation = [
  body('first_name').isLength({ min: 1, max: 50 }).withMessage('First name is required and must be 1-50 characters'),
  body('last_name').isLength({ min: 1, max: 50 }).withMessage('Last name is required and must be 1-50 characters'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number format'),
  body('date_of_birth').optional().isISO8601().withMessage('Invalid date format'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('blood_group').optional().isIn(['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-']).withMessage('Invalid blood group'),
  body('role').optional().isIn(['member', 'group_leader']).withMessage('Invalid role'),
  body('family_id').optional().isUUID().withMessage('Invalid family ID')
];

const updateUserValidation = [
  body('first_name').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('last_name').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number format'),
  body('date_of_birth').optional().isISO8601().withMessage('Invalid date format'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('blood_group').optional().isIn(['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-']).withMessage('Invalid blood group'),
  body('role').optional().isIn(['admin', 'member', 'group_leader']).withMessage('Invalid role'),
  body('family_id').optional().isUUID().withMessage('Invalid family ID'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
];

// GET /api/users - List all users with pagination and search
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const search = req.query['search'] as string;
    const role = req.query['role'] as string;
    const family_id = req.query['family_id'] as string;
    const sort_by = req.query['sort_by'] as string || 'created_at';
    const sort_order = req.query['sort_order'] as string || 'desc';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        families:family_id (
          id,
          family_name
        )
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (family_id) {
      query = query.eq('family_id', family_id);
    }

    // Apply sorting and pagination
    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to fetch users'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<UserProfile[]> = {
      success: true,
      data: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /users:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /api/users/:id - Get specific user
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Users can only access their own profile unless they're admin
    if (req.user?.role !== 'admin' && req.user?.id !== id) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Access denied'
      };
      res.status(403).json(response);
      return;
    }

    const { data: user, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        families:family_id (
          id,
          family_name,
          address,
          phone,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<UserProfile> = {
      success: true,
      data: user
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /users/:id:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', authenticateToken, requireAdmin, createUserValidation, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation error',
        message: errors.array().map(err => err.msg).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const userData: CreateUserProfileRequest = req.body;

    const { data: newUser, error } = await supabase
      .from('user_profiles')
      .insert({
        ...userData,
        role: userData.role || 'member'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to create user'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<UserProfile> = {
      success: true,
      data: newUser,
      message: 'User created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in POST /users:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', authenticateToken, updateUserValidation, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation error',
        message: errors.array().map(err => err.msg).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const { id } = req.params;
    const updateData: UpdateUserProfileRequest = req.body;

    // Users can only update their own profile unless they're admin
    // Also, non-admins cannot change role or is_active status
    if (req.user?.role !== 'admin') {
      if (req.user?.id !== id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Access denied'
        };
        res.status(403).json(response);
        return;
      }
      
      // Remove admin-only fields
      delete updateData.role;
      delete updateData.is_active;
    }

    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to update user'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<UserProfile> = {
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in PUT /users/:id:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/users/:id - Deactivate user (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Soft delete by setting is_active to false
    const { data: deactivatedUser, error } = await supabase
      .from('user_profiles')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating user:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to deactivate user'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<UserProfile> = {
      success: true,
      data: deactivatedUser,
      message: 'User deactivated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in DELETE /users/:id:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
