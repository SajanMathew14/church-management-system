import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../services/supabase';
import { authenticateToken, requireAdmin, requireAdminOrGroupLeader, AuthenticatedRequest } from '../middleware/auth';
import { 
  Group, 
  GroupMembership,
  CreateGroupRequest, 
  UpdateGroupRequest, 
  ApiResponse 
} from '../types/database';

const router = Router();

// Validation rules
const createGroupValidation = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Group name is required and must be 1-100 characters'),
  body('group_type').isIn(['sunday_school', 'choir', 'youth', 'senior_youth', 'ministry', 'other']).withMessage('Invalid group type'),
  body('leader_id').optional().isUUID().withMessage('Invalid leader ID'),
  body('max_members').optional().isInt({ min: 1 }).withMessage('Max members must be a positive integer'),
  body('meeting_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)')
];

const updateGroupValidation = [
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Group name must be 1-100 characters'),
  body('group_type').optional().isIn(['sunday_school', 'choir', 'youth', 'senior_youth', 'ministry', 'other']).withMessage('Invalid group type'),
  body('leader_id').optional().isUUID().withMessage('Invalid leader ID'),
  body('max_members').optional().isInt({ min: 1 }).withMessage('Max members must be a positive integer'),
  body('meeting_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
];

// GET /api/groups - List all groups with pagination and search
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const search = req.query['search'] as string;
    const group_type = req.query['group_type'] as string;
    const is_active = req.query['is_active'] as string;
    const sort_by = req.query['sort_by'] as string || 'created_at';
    const sort_order = req.query['sort_order'] as string || 'desc';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('groups')
      .select(`
        *,
        leader:leader_id (
          id,
          first_name,
          last_name,
          phone,
          email
        ),
        memberships:group_memberships!group_id (
          id,
          user_id,
          status,
          role,
          user_profiles!user_id (
            id,
            first_name,
            last_name
          )
        )
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,meeting_location.ilike.%${search}%`);
    }

    if (group_type) {
      query = query.eq('group_type', group_type);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    // Apply sorting and pagination
    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: groups, error, count } = await query;

    if (error) {
      console.error('Error fetching groups:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to fetch groups'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<Group[]> = {
      success: true,
      data: groups || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /groups:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /api/groups/:id - Get specific group
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        leader:leader_id (
          id,
          first_name,
          last_name,
          phone,
          email,
          role
        ),
        memberships:group_memberships!group_id (
          id,
          status,
          role,
          joined_date,
          requested_at,
          approved_at,
          user_profiles!user_id (
            id,
            first_name,
            last_name,
            phone,
            email,
            date_of_birth
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching group:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Group not found'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Group> = {
      success: true,
      data: group
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /groups/:id:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// POST /api/groups - Create new group
router.post('/', authenticateToken, requireAdminOrGroupLeader, createGroupValidation, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const groupData: CreateGroupRequest = req.body;

    // Validate leader exists if provided
    if (groupData.leader_id) {
      const { data: leader, error: leaderError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', groupData.leader_id)
        .single();

      if (leaderError || !leader) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group leader not found'
        };
        res.status(400).json(response);
        return;
      }

      if (leader.role !== 'admin' && leader.role !== 'group_leader') {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Selected user cannot be a group leader. User must have admin or group_leader role.'
        };
        res.status(400).json(response);
        return;
      }
    }

    const { data: newGroup, error } = await supabase
      .from('groups')
      .insert(groupData)
      .select()
      .single();

    if (error) {
      console.error('Error creating group:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to create group'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<Group> = {
      success: true,
      data: newGroup,
      message: 'Group created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in POST /groups:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// PUT /api/groups/:id - Update group
router.put('/:id', authenticateToken, updateGroupValidation, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const updateData: UpdateGroupRequest = req.body;

    // Check permissions - admins can update any group, group leaders can update their own groups
    if (req.user?.role !== 'admin') {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('leader_id')
        .eq('id', id)
        .single();

      if (groupError || !group || group.leader_id !== req.user?.id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Access denied. You can only update groups you lead.'
        };
        res.status(403).json(response);
        return;
      }

      // Group leaders cannot change is_active status
      delete updateData.is_active;
    }

    // Validate leader exists if being updated
    if (updateData.leader_id) {
      const { data: leader, error: leaderError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', updateData.leader_id)
        .single();

      if (leaderError || !leader) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group leader not found'
        };
        res.status(400).json(response);
        return;
      }

      if (leader.role !== 'admin' && leader.role !== 'group_leader') {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Selected user cannot be a group leader. User must have admin or group_leader role.'
        };
        res.status(400).json(response);
        return;
      }
    }

    const { data: updatedGroup, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating group:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to update group'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<Group> = {
      success: true,
      data: updatedGroup,
      message: 'Group updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in PUT /groups/:id:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/groups/:id - Delete group (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: deletedGroup, error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting group:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to delete group'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<Group> = {
      success: true,
      data: deletedGroup,
      message: 'Group deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in DELETE /groups/:id:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// POST /api/groups/:id/join - Request to join group
router.post('/:id/join', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User authentication required'
      };
      res.status(401).json(response);
      return;
    }

    // Check if group exists and is active
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name, is_active, max_members')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Group not found'
      };
      res.status(404).json(response);
      return;
    }

    if (!group.is_active) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Group is not active'
      };
      res.status(400).json(response);
      return;
    }

    // Check if user is already a member or has pending request
    const { data: existingMembership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (existingMembership) {
      let message = '';
      switch (existingMembership.status) {
        case 'approved':
          message = 'You are already a member of this group';
          break;
        case 'pending':
          message = 'You already have a pending request for this group';
          break;
        case 'rejected':
          message = 'Your previous request was rejected. Please contact the group leader.';
          break;
        case 'inactive':
          message = 'Your membership is inactive. Please contact the group leader.';
          break;
      }

      const response: ApiResponse<null> = {
        success: false,
        error: message
      };
      res.status(400).json(response);
      return;
    }

    // Check if group has reached max members
    if (group.max_members) {
      const { data: currentMembers, error: countError } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', groupId)
        .eq('status', 'approved');

      if (countError) {
        console.error('Error counting group members:', countError);
        const response: ApiResponse<null> = {
          success: false,
          error: 'Failed to check group capacity'
        };
        res.status(500).json(response);
        return;
      }

      if (currentMembers && currentMembers.length >= group.max_members) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group has reached maximum capacity'
        };
        res.status(400).json(response);
        return;
      }
    }

    // Create membership request
    const { data: newMembership, error } = await supabase
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_id: userId,
        status: 'pending',
        role: 'member'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating membership request:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to create membership request'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<GroupMembership> = {
      success: true,
      data: newMembership,
      message: 'Membership request submitted successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in POST /groups/:id/join:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /api/groups/:id/members - Get group members
router.get('/:id/members', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const status = req.query['status'] as string || 'approved';

    // Check if user has permission to view group members
    // Admins, group leaders, and group members can view
    const isAdmin = req.user?.role === 'admin';
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('leader_id')
      .eq('id', groupId)
      .single();

    const isGroupLeader = group && group.leader_id === req.user?.id;

    const { data: userMembership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user?.id)
      .eq('status', 'approved')
      .single();

    const isGroupMember = !!userMembership;

    if (!isAdmin && !isGroupLeader && !isGroupMember) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Access denied'
      };
      res.status(403).json(response);
      return;
    }

    const { data: memberships, error } = await supabase
      .from('group_memberships')
      .select(`
        id,
        status,
        role,
        joined_date,
        requested_at,
        approved_at,
        user_profiles!user_id (
          id,
          first_name,
          last_name,
          phone,
          email,
          date_of_birth,
          role
        )
      `)
      .eq('group_id', groupId)
      .eq('status', status)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching group members:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to fetch group members'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<any[]> = {
      success: true,
      data: memberships || []
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /groups/:id/members:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// PUT /api/groups/:id/members/:membershipId - Approve/reject membership
router.put('/:id/members/:membershipId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: groupId, membershipId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Status must be either "approved" or "rejected"'
      };
      res.status(400).json(response);
      return;
    }

    // Check if user has permission (admin or group leader)
    const isAdmin = req.user?.role === 'admin';
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('leader_id')
      .eq('id', groupId)
      .single();

    if (!isAdmin && (!group || group.leader_id !== req.user?.id)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Access denied. Only group leaders and admins can approve/reject memberships.'
      };
      res.status(403).json(response);
      return;
    }

    const updateData: any = {
      status,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      approved_by: req.user?.id
    };

    if (status === 'approved') {
      updateData.joined_date = new Date().toISOString().split('T')[0]; // Current date
    }

    const { data: updatedMembership, error } = await supabase
      .from('group_memberships')
      .update(updateData)
      .eq('id', membershipId)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) {
      console.error('Error updating membership:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to update membership status'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<GroupMembership> = {
      success: true,
      data: updatedMembership,
      message: `Membership ${status} successfully`
    };

    res.json(response);
  } catch (error) {
    console.error('Error in PUT /groups/:id/members/:membershipId:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/groups/:id/members/:membershipId - Remove member from group
router.delete('/:id/members/:membershipId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: groupId, membershipId } = req.params;

    // Check if user has permission (admin or group leader)
    const isAdmin = req.user?.role === 'admin';
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('leader_id')
      .eq('id', groupId)
      .single();

    if (!isAdmin && (!group || group.leader_id !== req.user?.id)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Access denied. Only group leaders and admins can remove members.'
      };
      res.status(403).json(response);
      return;
    }

    const { data: deletedMembership, error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('id', membershipId)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) {
      console.error('Error removing member:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to remove member from group'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<GroupMembership> = {
      success: true,
      data: deletedMembership,
      message: 'Member removed from group successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in DELETE /groups/:id/members/:membershipId:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
