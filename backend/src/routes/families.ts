import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../services/supabase';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { 
  Family, 
  CreateFamilyRequest, 
  UpdateFamilyRequest, 
  ApiResponse 
} from '../types/database';

const router = Router();

// Validation rules
const createFamilyValidation = [
  body('family_name').isLength({ min: 1, max: 100 }).withMessage('Family name is required and must be 1-100 characters'),
  body('head_of_family_id').optional().isUUID().withMessage('Invalid head of family ID'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number format'),
  body('email').optional().isEmail().withMessage('Invalid email format')
];

const updateFamilyValidation = [
  body('family_name').optional().isLength({ min: 1, max: 100 }).withMessage('Family name must be 1-100 characters'),
  body('head_of_family_id').optional().isUUID().withMessage('Invalid head of family ID'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number format'),
  body('email').optional().isEmail().withMessage('Invalid email format')
];

// GET /api/families - List all families with pagination and search
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const search = req.query['search'] as string;
    const sort_by = req.query['sort_by'] as string || 'created_at';
    const sort_order = req.query['sort_order'] as string || 'desc';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('families')
      .select(`
        *,
        head_of_family:head_of_family_id (
          id,
          first_name,
          last_name,
          phone,
          email
        ),
        members:user_profiles!family_id (
          id,
          first_name,
          last_name,
          phone,
          role,
          is_active
        )
      `, { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`family_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: families, error, count } = await query;

    if (error) {
      console.error('Error fetching families:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to fetch families'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<Family[]> = {
      success: true,
      data: families || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /families:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /api/families/:id - Get specific family
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: family, error } = await supabase
      .from('families')
      .select(`
        *,
        head_of_family:head_of_family_id (
          id,
          first_name,
          last_name,
          phone,
          email,
          date_of_birth,
          gender
        ),
        members:user_profiles!family_id (
          id,
          first_name,
          last_name,
          phone,
          email,
          date_of_birth,
          gender,
          blood_group,
          role,
          is_active,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching family:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Family not found'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Family> = {
      success: true,
      data: family
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /families/:id:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// POST /api/families - Create new family (Admin only)
router.post('/', authenticateToken, requireAdmin, createFamilyValidation, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const familyData: CreateFamilyRequest = req.body;

    // Validate head of family exists if provided
    if (familyData.head_of_family_id) {
      const { data: headOfFamily, error: headError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', familyData.head_of_family_id)
        .single();

      if (headError || !headOfFamily) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Head of family not found'
        };
        res.status(400).json(response);
        return;
      }
    }

    const { data: newFamily, error } = await supabase
      .from('families')
      .insert(familyData)
      .select()
      .single();

    if (error) {
      console.error('Error creating family:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to create family'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<Family> = {
      success: true,
      data: newFamily,
      message: 'Family created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in POST /families:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// PUT /api/families/:id - Update family
router.put('/:id', authenticateToken, updateFamilyValidation, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const updateData: UpdateFamilyRequest = req.body;

    // Check if user has permission to update this family
    // Admins can update any family, family heads can update their own family
    if (req.user?.role !== 'admin') {
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('head_of_family_id')
        .eq('id', id)
        .single();

      if (familyError || !family || family.head_of_family_id !== req.user?.id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Access denied'
        };
        res.status(403).json(response);
        return;
      }
    }

    // Validate head of family exists if being updated
    if (updateData.head_of_family_id) {
      const { data: headOfFamily, error: headError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', updateData.head_of_family_id)
        .single();

      if (headError || !headOfFamily) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Head of family not found'
        };
        res.status(400).json(response);
        return;
      }
    }

    const { data: updatedFamily, error } = await supabase
      .from('families')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating family:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to update family'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<Family> = {
      success: true,
      data: updatedFamily,
      message: 'Family updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in PUT /families/:id:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/families/:id - Delete family (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if family has members
    const { data: members, error: membersError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('family_id', id)
      .limit(1);

    if (membersError) {
      console.error('Error checking family members:', membersError);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to check family members'
      };
      res.status(500).json(response);
      return;
    }

    if (members && members.length > 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Cannot delete family with existing members. Please reassign or remove members first.'
      };
      res.status(400).json(response);
      return;
    }

    const { data: deletedFamily, error } = await supabase
      .from('families')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting family:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to delete family'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<Family> = {
      success: true,
      data: deletedFamily,
      message: 'Family deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in DELETE /families/:id:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// POST /api/families/:id/members/:userId - Add member to family (Admin only)
router.post('/:id/members/:userId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: familyId, userId } = req.params;

    // Verify family exists
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id')
      .eq('id', familyId)
      .single();

    if (familyError || !family) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Family not found'
      };
      res.status(404).json(response);
      return;
    }

    // Update user's family_id
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update({ family_id: familyId })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error adding member to family:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to add member to family'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<any> = {
      success: true,
      data: updatedUser,
      message: 'Member added to family successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in POST /families/:id/members/:userId:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/families/:id/members/:userId - Remove member from family (Admin only)
router.delete('/:id/members/:userId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Remove user from family
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update({ family_id: null })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error removing member from family:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to remove member from family'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<any> = {
      success: true,
      data: updatedUser,
      message: 'Member removed from family successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in DELETE /families/:id/members/:userId:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
