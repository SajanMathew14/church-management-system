import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { supabase } from '../services/supabase';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { ExcelImportService } from '../services/excelImport';
import { ApiResponse, ImportJob } from '../types/database';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env['UPLOAD_DIR'] || 'uploads';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env['MAX_FILE_SIZE'] || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// GET /api/import/template - Download Excel template
router.get('/template', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const templateBuffer = await ExcelImportService.generateTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="church-members-import-template.xlsx"');
    
    res.send(templateBuffer);
  } catch (error) {
    console.error('Error generating template:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to generate import template'
    };
    res.status(500).json(response);
  }
});

// POST /api/import/excel - Upload and process Excel file
router.post('/excel', authenticateToken, requireAdmin, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'No file uploaded'
      };
      res.status(400).json(response);
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User authentication required'
      };
      res.status(401).json(response);
      return;
    }

    // Create import job record
    const { data: importJob, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        filename: req.file.originalname,
        file_url: req.file.path,
        status: 'pending',
        created_by: userId
      })
      .select()
      .single();

    if (jobError || !importJob) {
      console.error('Error creating import job:', jobError);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to create import job'
      };
      res.status(500).json(response);
      return;
    }

    // Parse Excel file
    let rows;
    try {
      rows = await ExcelImportService.parseExcelFile(req.file.path);
    } catch (parseError) {
      console.error('Error parsing Excel file:', parseError);
      
      // Update job as failed
      await supabase
        .from('import_jobs')
        .update({
          status: 'failed',
          error_log: [{
            row: 0,
            error: `File parsing error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            data: {}
          }],
          completed_at: new Date().toISOString()
        })
        .eq('id', importJob.id);

      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to parse Excel file. Please check the file format and try again.'
      };
      res.status(400).json(response);
      return;
    }

    if (rows.length === 0) {
      // Update job as failed
      await supabase
        .from('import_jobs')
        .update({
          status: 'failed',
          error_log: [{
            row: 0,
            error: 'No valid data rows found in Excel file',
            data: {}
          }],
          completed_at: new Date().toISOString()
        })
        .eq('id', importJob.id);

      const response: ApiResponse<null> = {
        success: false,
        error: 'No valid data found in Excel file'
      };
      res.status(400).json(response);
      return;
    }

    if (rows.length > 5000) {
      // Update job as failed
      await supabase
        .from('import_jobs')
        .update({
          status: 'failed',
          error_log: [{
            row: 0,
            error: 'File contains too many records. Maximum allowed: 5,000',
            data: { totalRows: rows.length }
          }],
          completed_at: new Date().toISOString()
        })
        .eq('id', importJob.id);

      const response: ApiResponse<null> = {
        success: false,
        error: `File contains ${rows.length} records. Maximum allowed: 5,000`
      };
      res.status(400).json(response);
      return;
    }

    // Start processing in background (in a real application, you'd use a job queue)
    ExcelImportService.processImport(importJob.id, rows, userId)
      .catch(error => {
        console.error('Import processing error:', error);
      });

    // Clean up uploaded file after processing starts
    fs.unlink(req.file.path).catch(error => {
      console.error('Error cleaning up uploaded file:', error);
    });

    const response: ApiResponse<{ jobId: string; totalRows: number }> = {
      success: true,
      data: {
        jobId: importJob.id,
        totalRows: rows.length
      },
      message: 'Import job started successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in POST /import/excel:', error);
    
    // Clean up uploaded file in case of error
    if (req.file) {
      fs.unlink(req.file.path).catch(unlinkError => {
        console.error('Error cleaning up uploaded file:', unlinkError);
      });
    }

    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /api/import/status/:jobId - Check import job status
router.get('/status/:jobId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const { data: importJob, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !importJob) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Import job not found'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<ImportJob> = {
      success: true,
      data: importJob
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /import/status/:jobId:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /api/import/history - View import history
router.get('/history', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = (page - 1) * limit;

    const { data: imports, error, count } = await supabase
      .from('import_jobs')
      .select(`
        id,
        filename,
        status,
        total_records,
        successful_records,
        failed_records,
        created_at,
        started_at,
        completed_at,
        user_profiles!created_by (
          id,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching import history:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to fetch import history'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<any[]> = {
      success: true,
      data: imports || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /import/history:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /api/import/:jobId/errors - Get detailed error log for import job
router.get('/:jobId/errors', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const { data: importJob, error } = await supabase
      .from('import_jobs')
      .select('error_log, filename, failed_records')
      .eq('id', jobId)
      .single();

    if (error || !importJob) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Import job not found'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<{
      filename: string;
      failedRecords: number;
      errors: any[];
    }> = {
      success: true,
      data: {
        filename: importJob.filename,
        failedRecords: importJob.failed_records,
        errors: importJob.error_log || []
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in GET /import/:jobId/errors:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/import/:jobId - Cancel/delete import job
router.delete('/:jobId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    // Get job details first
    const { data: importJob, error: fetchError } = await supabase
      .from('import_jobs')
      .select('status, file_url')
      .eq('id', jobId)
      .single();

    if (fetchError || !importJob) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Import job not found'
      };
      res.status(404).json(response);
      return;
    }

    if (importJob.status === 'processing') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Cannot delete a job that is currently processing'
      };
      res.status(400).json(response);
      return;
    }

    // Clean up file if it exists
    if (importJob.file_url) {
      fs.unlink(importJob.file_url).catch(error => {
        console.error('Error cleaning up import file:', error);
      });
    }

    // Delete the job
    const { error: deleteError } = await supabase
      .from('import_jobs')
      .delete()
      .eq('id', jobId);

    if (deleteError) {
      console.error('Error deleting import job:', deleteError);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to delete import job'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Import job deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error in DELETE /import/:jobId:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
