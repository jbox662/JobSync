import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { attachmentSyncService, AttachmentData } from '../services/attachmentSync';

interface Attachment {
  id: string;
  name: string;
  uri: string;
  size: number;
  type: string;
  supabaseUrl?: string;
  localPath?: string;
}

interface AttachmentManagerProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  maxAttachments?: number;
  readOnly?: boolean;
  // Sync props
  workspaceId?: string;
  documentType?: 'invoice' | 'quote';
  documentId?: string;
  enableSync?: boolean;
  settings?: any;
}

const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  attachments,
  onAttachmentsChange,
  maxAttachments = 5,
  readOnly = false,
  workspaceId,
  documentType,
  documentId,
  enableSync = false,
  settings
}) => {
  const [isPicking, setIsPicking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type.includes('pdf')) return 'document-text-outline';
    if (type.includes('image')) return 'image-outline';
    if (type.includes('word') || type.includes('document')) return 'document-outline';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'grid-outline';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'easel-outline';
    return 'attach-outline';
  };

  const pickDocument = async () => {
    if (attachments.length >= maxAttachments) {
      Alert.alert('Limit Reached', `You can only attach up to ${maxAttachments} files.`);
      return;
    }

    setIsPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Check file size (max 10MB)
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
          return;
        }

        // Copy file to permanent storage in app's document directory
        const permanentUri = `${FileSystem.documentDirectory}attachments/${Date.now()}_${file.name || 'Unknown File'}`;
        
        // Ensure attachments directory exists
        const attachmentsDir = `${FileSystem.documentDirectory}attachments/`;
        const dirInfo = await FileSystem.getInfoAsync(attachmentsDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(attachmentsDir, { intermediates: true });
        }
        
        // Copy file to permanent location
        await FileSystem.copyAsync({
          from: file.uri,
          to: permanentUri
        });

        const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: file.name || 'Unknown File',
          uri: permanentUri, // Use permanent URI
          size: fileInfo.size || 0,
          type: file.mimeType || 'application/octet-stream'
        };

        // Upload to Supabase if sync is enabled
        if (enableSync && workspaceId && documentType && documentId) {
          console.log('Uploading attachment to Supabase...', {
            workspaceId,
            documentType,
            documentId,
            attachment: newAttachment
          });
          
          setIsUploading(true);
        
          try {
            const uploadResult = await attachmentSyncService.uploadAttachment(
              newAttachment,
              workspaceId,
              documentType,
              documentId
            );

            console.log('Upload result:', uploadResult);

            if (uploadResult.success && uploadResult.supabaseUrl) {
              newAttachment.supabaseUrl = uploadResult.supabaseUrl;
              newAttachment.localPath = permanentUri;
              console.log('Attachment uploaded successfully:', newAttachment.supabaseUrl);
            } else {
              console.warn('Failed to upload attachment:', uploadResult.error);
              // Continue with local-only attachment
            }
          } catch (error) {
            console.error('Upload error:', error);
            // Continue with local-only attachment
          } finally {
            setIsUploading(false);
          }
        } else {
          console.log('Sync disabled or missing props:', {
            enableSync,
            workspaceId,
            documentType,
            documentId
          });
        }

        onAttachmentsChange([...attachments, newAttachment]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  const removeAttachment = async (id: string) => {
    Alert.alert(
      'Remove Attachment',
      'Are you sure you want to remove this attachment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const attachmentToRemove = attachments.find(att => att.id === id);
            
            // Delete the file from storage
            if (attachmentToRemove) {
              try {
                // Delete from Supabase if synced
                if (enableSync && attachmentToRemove.supabaseUrl) {
                  await attachmentSyncService.deleteAttachment(attachmentToRemove.supabaseUrl);
                }

                // Delete local file
                const fileInfo = await FileSystem.getInfoAsync(attachmentToRemove.uri);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(attachmentToRemove.uri);
                }
              } catch (error) {
                console.log('Error deleting file:', error);
                // Continue with removal even if file deletion fails
              }
            }
            
            // Remove from attachments list
            onAttachmentsChange(attachments.filter(att => att.id !== id));
          }
        }
      ]
    );
  };

  const openAttachment = async (attachment: Attachment) => {
    try {
      console.log('Opening attachment:', attachment);
      
      let fileUri = attachment.uri;
      
      // If this is a synced attachment and we don't have the local file, download it
      if (attachment.supabaseUrl && !attachment.localPath) {
        const localPath = attachmentSyncService.getLocalCachePath(attachment.id, attachment.name);
        const isCached = await attachmentSyncService.isAttachmentCached(localPath);
        
        if (!isCached) {
          // Download from Supabase
          const downloadResult = await attachmentSyncService.downloadAttachment(
            attachment.supabaseUrl,
            localPath
          );
          
          if (downloadResult.success && downloadResult.localPath) {
            fileUri = downloadResult.localPath;
            // Update the attachment with the local path
            const updatedAttachments = attachments.map(att => 
              att.id === attachment.id 
                ? { ...att, localPath: downloadResult.localPath }
                : att
            );
            onAttachmentsChange(updatedAttachments);
          } else {
            Alert.alert('Download Failed', 'Could not download the attachment. Please check your internet connection.');
            return;
          }
        } else {
          fileUri = localPath;
        }
      }
      
      // Check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log('File info:', fileInfo);
      
      if (!fileInfo.exists) {
        Alert.alert('File Not Found', 'The attachment file could not be found.');
        return;
      }

      // Skip the Linking.canOpenURL check for file:// URLs as it doesn't work reliably on iOS
      // Go straight to sharing which is more reliable for file attachments
      console.log('Using sharing to open file...');
      
      const isAvailable = await Sharing.isAvailableAsync();
      console.log('Sharing available:', isAvailable);
      
      if (isAvailable) {
        try {
          // Try sharing directly with the file URI
          await Sharing.shareAsync(fileUri, {
            mimeType: attachment.type,
            dialogTitle: `Open ${attachment.name}`,
            UTI: getUTIForMimeType(attachment.type)
          });
        } catch (shareError) {
          console.log('Direct sharing failed, trying copy method:', shareError);
          
          // If direct sharing fails, try copying to a more accessible location
          try {
            const newUri = `${FileSystem.documentDirectory}${attachment.name}`;
            await FileSystem.copyAsync({
              from: fileUri,
              to: newUri
            });
            console.log('File copied to:', newUri);
            
            // Try sharing the copied file
            await Sharing.shareAsync(newUri, {
              mimeType: attachment.type,
              dialogTitle: `Open ${attachment.name}`,
              UTI: getUTIForMimeType(attachment.type)
            });
          } catch (copyError) {
            console.log('Copy and share failed:', copyError);
            Alert.alert(
              'Cannot Open File',
              `Unable to open this file type (${attachment.type}). Please make sure you have an app installed that can handle this file type.`,
              [
                { text: 'OK', style: 'default' }
              ]
            );
          }
        }
      } else {
        Alert.alert(
          'Sharing Not Available',
          'File sharing is not available on this device. Please install an app that can handle this file type.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.log('Open attachment error:', error);
      Alert.alert(
        'Error Opening File', 
        `Failed to open the attachment: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure you have an app installed that can handle this file type.`
      );
    }
  };

  // Helper function to get UTI (Uniform Type Identifier) for better file type recognition
  const getUTIForMimeType = (mimeType: string): string => {
    const mimeToUTI: { [key: string]: string } = {
      'application/pdf': 'com.adobe.pdf',
      'application/msword': 'com.microsoft.word.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'org.openxmlformats.wordprocessingml.document',
      'application/vnd.ms-excel': 'com.microsoft.excel.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'org.openxmlformats.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint': 'com.microsoft.powerpoint.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'org.openxmlformats.presentationml.presentation',
      'text/plain': 'public.plain-text',
      'text/html': 'public.html',
      'text/rtf': 'public.rtf',
      'image/jpeg': 'public.jpeg',
      'image/png': 'public.png',
      'image/gif': 'com.compuserve.gif',
      'image/tiff': 'public.tiff'
    };
    
    return mimeToUTI[mimeType] || 'public.data';
  };

  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-medium mb-2">Attachments</Text>
      
      {/* Add Attachment Button - Hidden in read-only mode */}
      {!readOnly && (
        <Pressable
          onPress={pickDocument}
          disabled={isPicking || isUploading || attachments.length >= maxAttachments}
          className={`flex-row items-center justify-center py-3 px-4 rounded-lg border-2 border-dashed ${
            attachments.length >= maxAttachments 
              ? 'border-gray-200 bg-gray-50' 
              : 'border-blue-300 bg-blue-50'
          }`}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text className="ml-2 font-medium text-blue-600">Uploading...</Text>
            </>
          ) : (
            <>
              <Ionicons 
                name={isPicking ? 'hourglass-outline' : 'add-outline'} 
                size={20} 
                color={attachments.length >= maxAttachments ? '#9CA3AF' : '#3B82F6'} 
              />
              <Text className={`ml-2 font-medium ${
                attachments.length >= maxAttachments ? 'text-gray-400' : 'text-blue-600'
              }`}>
                {isPicking ? 'Picking Document...' : 
                 attachments.length >= maxAttachments ? 'Max Attachments Reached' : 
                 'Add Attachment'}
              </Text>
            </>
          )}
        </Pressable>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <ScrollView className="mt-2" showsVerticalScrollIndicator={false}>
          {attachments.map((attachment) => (
            <View
              key={attachment.id}
              className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg mb-2"
            >
              <Pressable
                onPress={() => openAttachment(attachment)}
                className="flex-row items-center flex-1 mr-2"
              >
                <Ionicons 
                  name={getFileIcon(attachment.type)} 
                  size={20} 
                  color="#3B82F6" 
                />
                <View className="ml-3 flex-1">
                  <Text className="text-blue-600 font-medium" numberOfLines={1}>
                    {attachment.name}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {formatFileSize(attachment.size)} • Tap to open
                  </Text>
                </View>
                <Ionicons 
                  name="open-outline" 
                  size={16} 
                  color="#3B82F6" 
                />
              </Pressable>
              
              {!readOnly && (
                <Pressable
                  onPress={() => removeAttachment(attachment.id)}
                  className="p-1 ml-2"
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default AttachmentManager;
