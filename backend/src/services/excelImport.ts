import ExcelJS from 'exceljs';
import { supabase } from './supabase';
import { ImportJob, UserProfile, Family } from '../types/database';

export interface ExcelRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  familyName: string;
  headOfFamily: boolean;
  groupMemberships?: string;
  role?: 'member' | 'group_leader';
  notes?: string;
}

export interface ImportError {
  row: number;
  error: string;
  data: Record<string, any>;
}

export class ExcelImportService {
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static validatePhone(phone: string): boolean {
    // Basic phone validation - can be enhanced
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  private static validateBloodGroup(bloodGroup?: string): boolean {
    if (!bloodGroup) return true;
    const validGroups = ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'];
    return validGroups.includes(bloodGroup);
  }

  private static validateDate(dateStr?: string): boolean {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  public static async parseExcelFile(filePath: string): Promise<ExcelRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1); // First worksheet
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const rows: ExcelRow[] = [];
    
    // Skip header row (row 1)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const cells = row.values as any[];
      
      // Map Excel columns to data structure
      const rowData: ExcelRow = {
        firstName: cells[1]?.toString().trim() || '',
        lastName: cells[2]?.toString().trim() || '',
        email: cells[3]?.toString().trim().toLowerCase() || '',
        phone: cells[4]?.toString().trim() || '',
        dateOfBirth: cells[5]?.toString().trim() || undefined,
        gender: cells[6]?.toString().trim() || undefined,
        bloodGroup: cells[7]?.toString().trim() || undefined,
        address: cells[8]?.toString().trim() || undefined,
        emergencyContactName: cells[9]?.toString().trim() || undefined,
        emergencyContactPhone: cells[10]?.toString().trim() || undefined,
        familyName: cells[11]?.toString().trim() || '',
        headOfFamily: ['yes', 'y', 'true', '1'].includes(cells[12]?.toString().toLowerCase().trim() || ''),
        groupMemberships: cells[13]?.toString().trim() || undefined,
        role: (cells[14]?.toString().trim().toLowerCase() === 'group_leader') ? 'group_leader' : 'member',
        notes: cells[15]?.toString().trim() || undefined
      };

      // Only add rows that have required data
      if (rowData.firstName && rowData.lastName && rowData.email && rowData.phone && rowData.familyName) {
        rows.push(rowData);
      }
    });

    return rows;
  }

  public static validateRow(row: ExcelRow, rowNumber: number): ImportError | null {
    // Required field validation
    if (!row.firstName) {
      return { row: rowNumber, error: 'First name is required', data: row };
    }
    
    if (!row.lastName) {
      return { row: rowNumber, error: 'Last name is required', data: row };
    }
    
    if (!row.email) {
      return { row: rowNumber, error: 'Email is required', data: row };
    }
    
    if (!row.phone) {
      return { row: rowNumber, error: 'Phone is required', data: row };
    }
    
    if (!row.familyName) {
      return { row: rowNumber, error: 'Family name is required', data: row };
    }

    // Format validation
    if (!this.validateEmail(row.email)) {
      return { row: rowNumber, error: 'Invalid email format', data: row };
    }

    if (!this.validatePhone(row.phone)) {
      return { row: rowNumber, error: 'Invalid phone number format', data: row };
    }

    if (!this.validateBloodGroup(row.bloodGroup)) {
      return { row: rowNumber, error: 'Invalid blood group', data: row };
    }

    if (!this.validateDate(row.dateOfBirth)) {
      return { row: rowNumber, error: 'Invalid date of birth format', data: row };
    }

    if (row.gender && !['Male', 'Female', 'Other'].includes(row.gender)) {
      return { row: rowNumber, error: 'Invalid gender. Must be Male, Female, or Other', data: row };
    }

    return null;
  }

  public static async processImport(
    jobId: string, 
    rows: ExcelRow[], 
    createdBy: string
  ): Promise<void> {
    const errors: ImportError[] = [];
    const familyMap = new Map<string, string>(); // familyName -> familyId
    const groupMap = new Map<string, string>(); // groupName -> groupId
    let processedCount = 0;
    let successCount = 0;

    try {
      // Update job status to processing
      await supabase
        .from('import_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          total_records: rows.length
        })
        .eq('id', jobId);

      // Get existing groups for membership assignment
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name');
      
      if (groups) {
        groups.forEach(group => {
          groupMap.set(group.name.toLowerCase(), group.id);
        });
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        const rowNumber = i + 2; // +2 because Excel starts at 1 and we skip header
        
        try {
          // Validate row
          const validationError = this.validateRow(row, rowNumber);
          if (validationError) {
            errors.push(validationError);
            continue;
          }

          // Check for duplicate email/phone in database
          const { data: existingUser } = await supabase
            .from('user_profiles')
            .select('id, email, phone')
            .or(`email.eq.${row.email},phone.eq.${row.phone}`)
            .single();

          let userId = existingUser?.id;

          if (existingUser) {
            // Update existing user
            const { data: updatedUser, error: updateError } = await supabase
              .from('user_profiles')
              .update({
                first_name: row.firstName,
                last_name: row.lastName,
                phone: row.phone,
                date_of_birth: row.dateOfBirth || null,
                gender: row.gender || null,
                blood_group: row.bloodGroup || null,
                address: row.address || null,
                emergency_contact_name: row.emergencyContactName || null,
                emergency_contact_phone: row.emergencyContactPhone || null,
                role: row.role || 'member'
              })
              .eq('id', existingUser.id)
              .select()
              .single();

            if (updateError) {
              errors.push({ 
                row: rowNumber, 
                error: `Failed to update user: ${updateError.message}`, 
                data: row as Record<string, any>
              });
              continue;
            }
          } else {
            // Create new user profile (Note: In real implementation, we'd need to create auth user first)
            const { data: newUser, error: createError } = await supabase
              .from('user_profiles')
              .insert({
                first_name: row.firstName,
                last_name: row.lastName,
                phone: row.phone,
                date_of_birth: row.dateOfBirth || null,
                gender: row.gender || null,
                blood_group: row.bloodGroup || null,
                address: row.address || null,
                emergency_contact_name: row.emergencyContactName || null,
                emergency_contact_phone: row.emergencyContactPhone || null,
                role: row.role || 'member'
              })
              .select()
              .single();

            if (createError) {
              errors.push({ 
                row: rowNumber, 
                error: `Failed to create user: ${createError.message}`, 
                data: row as Record<string, any>
              });
              continue;
            }

            userId = newUser.id;
          }

          // Handle family assignment
          let familyId = familyMap.get(row.familyName?.toLowerCase() || '');
          
          if (!familyId) {
            // Check if family exists
            const { data: existingFamily } = await supabase
              .from('families')
              .select('id')
              .ilike('family_name', row.familyName || '')
              .single();

            if (existingFamily) {
              familyId = existingFamily.id;
            } else {
              // Create new family
              const { data: newFamily, error: familyError } = await supabase
                .from('families')
                .insert({
                  family_name: row.familyName,
                  address: row.address || null,
                  phone: row.phone
                })
                .select()
                .single();

              if (familyError) {
                errors.push({ 
                  row: rowNumber, 
                  error: `Failed to create family: ${familyError.message}`, 
                  data: row as Record<string, any>
                });
                continue;
              }

              familyId = newFamily.id;
            }
            
            if (familyId) {
              familyMap.set(row.familyName?.toLowerCase() || '', familyId);
            }
          }

          // Update user with family_id
          if (familyId && userId) {
            await supabase
              .from('user_profiles')
              .update({ family_id: familyId })
              .eq('id', userId);

            // Set head of family if specified
            if (row.headOfFamily && familyId) {
              await supabase
                .from('families')
                .update({ head_of_family_id: userId })
                .eq('id', familyId);
            }
          }

          // Handle group memberships
          if (row.groupMemberships && userId) {
            const groupNames = row.groupMemberships.split(',').map(name => name.trim().toLowerCase());
            
            for (const groupName of groupNames) {
              const groupId = groupMap.get(groupName);
              if (groupId) {
                // Create membership request
                await supabase
                  .from('group_memberships')
                  .upsert({
                    group_id: groupId,
                    user_id: userId,
                    status: 'pending',
                    role: 'member'
                  }, {
                    onConflict: 'group_id,user_id'
                  });
              }
            }
          }

          successCount++;
        } catch (error) {
          errors.push({ 
            row: rowNumber, 
            error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            data: row as Record<string, any>
          });
        }

        processedCount++;

        // Update progress periodically
        if (processedCount % 10 === 0) {
          await supabase
            .from('import_jobs')
            .update({
              processed_records: processedCount,
              successful_records: successCount,
              failed_records: errors.length
            })
            .eq('id', jobId);
        }
      }

      // Final job update
      await supabase
        .from('import_jobs')
        .update({
          status: 'completed',
          processed_records: processedCount,
          successful_records: successCount,
          failed_records: errors.length,
          error_log: errors,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

    } catch (error) {
      // Mark job as failed
      await supabase
        .from('import_jobs')
        .update({
          status: 'failed',
          processed_records: processedCount,
          successful_records: successCount,
          failed_records: errors.length,
          error_log: errors,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      throw error;
    }
  }

  public static async generateTemplate(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Members Import Template');

    // Define columns
    worksheet.columns = [
      { header: 'First Name*', key: 'firstName', width: 15 },
      { header: 'Last Name*', key: 'lastName', width: 15 },
      { header: 'Email*', key: 'email', width: 25 },
      { header: 'Phone*', key: 'phone', width: 15 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Blood Group', key: 'bloodGroup', width: 12 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Emergency Contact Name', key: 'emergencyContactName', width: 20 },
      { header: 'Emergency Contact Phone', key: 'emergencyContactPhone', width: 20 },
      { header: 'Family Name*', key: 'familyName', width: 20 },
      { header: 'Head of Family', key: 'headOfFamily', width: 15 },
      { header: 'Group Memberships', key: 'groupMemberships', width: 25 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add sample data
    worksheet.addRow({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@email.com',
      phone: '+1234567890',
      dateOfBirth: '1985-06-15',
      gender: 'Male',
      bloodGroup: 'A+',
      address: '123 Main St, City, State',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+1234567891',
      familyName: 'Doe Family',
      headOfFamily: 'Yes',
      groupMemberships: 'Choir, Youth Group',
      role: 'member',
      notes: 'Active member since 2020'
    });

    worksheet.addRow({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@email.com',
      phone: '+1234567891',
      dateOfBirth: '1987-08-20',
      gender: 'Female',
      bloodGroup: 'B+',
      address: '123 Main St, City, State',
      emergencyContactName: 'John Doe',
      emergencyContactPhone: '+1234567890',
      familyName: 'Doe Family',
      headOfFamily: 'No',
      groupMemberships: 'Choir',
      role: 'member',
      notes: 'Spouse of John'
    });

    // Add instructions worksheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.addRow(['Church Management System - Member Import Template']);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(['REQUIRED FIELDS (marked with *):']);
    instructionsSheet.addRow(['• First Name']);
    instructionsSheet.addRow(['• Last Name']);
    instructionsSheet.addRow(['• Email']);
    instructionsSheet.addRow(['• Phone']);
    instructionsSheet.addRow(['• Family Name']);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(['FIELD FORMATS:']);
    instructionsSheet.addRow(['• Date of Birth: YYYY-MM-DD or MM/DD/YYYY']);
    instructionsSheet.addRow(['• Gender: Male, Female, or Other']);
    instructionsSheet.addRow(['• Blood Group: A+, B+, AB+, O+, A-, B-, AB-, O-']);
    instructionsSheet.addRow(['• Head of Family: Yes/No, Y/N, True/False, 1/0']);
    instructionsSheet.addRow(['• Group Memberships: Comma-separated group names']);
    instructionsSheet.addRow(['• Role: member or group_leader']);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(['NOTES:']);
    instructionsSheet.addRow(['• Families will be created automatically']);
    instructionsSheet.addRow(['• Group memberships will create pending requests']);
    instructionsSheet.addRow(['• Duplicate emails/phones will update existing users']);
    instructionsSheet.addRow(['• Maximum file size: 10MB, Maximum records: 5,000']);

    return workbook.xlsx.writeBuffer();
  }
}
