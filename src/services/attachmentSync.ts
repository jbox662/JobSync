import { supabase } from '../api/supabase';
import * as FileSystem from 'expo-file-system';

export interface AttachmentData {
  id: string;
  name: string;
  uri: string;
  size: number;
  type: string;
  supabaseUrl?: string; // URL after upload to Supabase
  localPath?: string; // Local cached path
}

export class AttachmentSyncService {
  private static instance: AttachmentSyncService;
  private bucketName = 'attachments';

  static getInstance(): AttachmentSyncService {
    if (!AttachmentSyncService.instance) {
      AttachmentSyncService.instance = new AttachmentSyncService();
    }
    return AttachmentSyncService.instance;
  }

  /**
   * Upload attachment to Supabase storage
   */
  async uploadAttachment(
    attachment: AttachmentData, 
    workspaceId: string, 
    documentType: 'invoice' | 'quote',
    documentId: string
  ): Promise<{ success: boolean; supabaseUrl?: string; error?: string }> {
    try {
      // Ensure bucket exists
      await this.ensureBucketExists();

      // Create unique file path
      const fileExtension = attachment.name.split('.').pop() || '';
      const fileName = `${workspaceId}/${documentType}/${documentId}/${attachment.id}.${fileExtension}`;
      
      // Read file as base64
      const fileData = await FileSystem.readAsStringAsync(attachment.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, fileData, {
          contentType: attachment.type,
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return { 
        success: true, 
        supabaseUrl: urlData.publicUrl 
      };
    } catch (error) {
      console.error('Upload attachment error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Download attachment from Supabase storage
   */
  async downloadAttachment(
    supabaseUrl: string, 
    localPath: string
  ): Promise<{ success: boolean; localPath?: string; error?: string }> {
    try {
      // Extract file path from URL
      const urlParts = supabaseUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = urlParts.slice(-4).join('/'); // workspaceId/documentType/documentId/filename

      // Download file
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        console.error('Download error:', error);
        return { success: false, error: error.message };
      }

      // Convert blob to base64 and save locally
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            await FileSystem.writeAsStringAsync(localPath, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            resolve({ success: true, localPath });
          } catch (writeError) {
            console.error('Write file error:', writeError);
            resolve({ 
              success: false, 
              error: writeError instanceof Error ? writeError.message : 'Write failed' 
            });
          }
        };
        reader.readAsDataURL(data);
      });
    } catch (error) {
      console.error('Download attachment error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete attachment from Supabase storage
   */
  async deleteAttachment(supabaseUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract file path from URL
      const urlParts = supabaseUrl.split('/');
      const filePath = urlParts.slice(-4).join('/'); // workspaceId/documentType/documentId/filename

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete attachment error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Ensure the attachments bucket exists
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      const { data, error } = await supabase.storage.getBucket(this.bucketName);
      
      if (error && error.message.includes('not found')) {
        // Create bucket if it doesn't exist
        const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/html',
            'text/rtf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/tiff'
          ]
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
        }
      }
    } catch (error) {
      console.error('Error checking bucket:', error);
    }
  }

  /**
   * Get local cache path for attachment
   */
  getLocalCachePath(attachmentId: string, fileName: string): string {
    return `${FileSystem.documentDirectory}attachments/cache/${attachmentId}_${fileName}`;
  }

  /**
   * Check if attachment is cached locally
   */
  async isAttachmentCached(localPath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }
}

export const attachmentSyncService = AttachmentSyncService.getInstance();
