import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface Attachment {
  id: string;
  name: string;
  uri: string;
  size: number;
  type: string;
}

interface AttachmentManagerProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  maxAttachments?: number;
  readOnly?: boolean;
}

const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  attachments,
  onAttachmentsChange,
  maxAttachments = 5,
  readOnly = false
}) => {
  const [isPicking, setIsPicking] = useState(false);

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

        const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: file.name || 'Unknown File',
          uri: file.uri,
          size: fileInfo.size || 0,
          type: file.mimeType || 'application/octet-stream'
        };

        onAttachmentsChange([...attachments, newAttachment]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  const removeAttachment = (id: string) => {
    Alert.alert(
      'Remove Attachment',
      'Are you sure you want to remove this attachment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onAttachmentsChange(attachments.filter(att => att.id !== id));
          }
        }
      ]
    );
  };

  const openAttachment = async (attachment: Attachment) => {
    try {
      console.log('Opening attachment:', attachment);
      
      // Check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(attachment.uri);
      console.log('File info:', fileInfo);
      
      if (!fileInfo.exists) {
        Alert.alert('File Not Found', 'The attachment file could not be found.');
        return;
      }

      // Try to open with the system's default app
      const canOpen = await Linking.canOpenURL(attachment.uri);
      console.log('Can open URL:', canOpen);
      
      if (canOpen) {
        console.log('Opening with Linking...');
        await Linking.openURL(attachment.uri);
      } else {
        console.log('Cannot open directly, trying sharing...');
        
        // Try to copy file to a more accessible location first
        try {
          const newUri = `${FileSystem.documentDirectory}${attachment.name}`;
          await FileSystem.copyAsync({
            from: attachment.uri,
            to: newUri
          });
          console.log('File copied to:', newUri);
          
          // Try sharing the copied file
          const isAvailable = await Sharing.isAvailableAsync();
          console.log('Sharing available:', isAvailable);
          
          if (isAvailable) {
            try {
              await Sharing.shareAsync(newUri, {
                mimeType: attachment.type,
                dialogTitle: `Open ${attachment.name}`
              });
            } catch (shareError) {
              console.log('Sharing error:', shareError);
              // Try with original URI as fallback
              try {
                await Sharing.shareAsync(attachment.uri, {
                  mimeType: attachment.type,
                  dialogTitle: `Open ${attachment.name}`
                });
              } catch (fallbackError) {
                console.log('Fallback sharing error:', fallbackError);
                Alert.alert(
                  'Cannot Open File',
                  `Unable to open this file type (${attachment.type}). The file may be corrupted or in an unsupported format.`,
                  [
                    { text: 'OK', style: 'default' }
                  ]
                );
              }
            }
          } else {
            Alert.alert(
              'Cannot Open File',
              'No app is available to open this file type. You can try sharing it instead.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Share',
                  onPress: async () => {
                    try {
                      await Sharing.shareAsync(newUri, {
                        mimeType: attachment.type,
                        dialogTitle: `Share ${attachment.name}`
                      });
                    } catch (error) {
                      console.log('Share error:', error);
                      Alert.alert('Error', 'Failed to share the file.');
                    }
                  }
                }
              ]
            );
          }
        } catch (copyError) {
          console.log('Copy error, trying original URI:', copyError);
          // If copying fails, try with original URI
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            try {
              await Sharing.shareAsync(attachment.uri, {
                mimeType: attachment.type,
                dialogTitle: `Open ${attachment.name}`
              });
            } catch (shareError) {
              console.log('Sharing error:', shareError);
              Alert.alert(
                'Cannot Open File',
                `Unable to open this file type (${attachment.type}). The file may be corrupted or in an unsupported format.`,
                [
                  { text: 'OK', style: 'default' }
                ]
              );
            }
          } else {
            Alert.alert(
              'Cannot Open File',
              'No app is available to open this file type.',
              [
                { text: 'OK', style: 'default' }
              ]
            );
          }
        }
      }
    } catch (error) {
      console.log('Open attachment error:', error);
      Alert.alert(
        'Error Opening File', 
        `Failed to open the attachment: ${error instanceof Error ? error.message : 'Unknown error'}. The file may be corrupted or in an unsupported format.`
      );
    }
  };

  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-medium mb-2">Attachments</Text>
      
      {/* Add Attachment Button - Hidden in read-only mode */}
      {!readOnly && (
        <Pressable
          onPress={pickDocument}
          disabled={isPicking || attachments.length >= maxAttachments}
          className={`flex-row items-center justify-center py-3 px-4 rounded-lg border-2 border-dashed ${
            attachments.length >= maxAttachments 
              ? 'border-gray-200 bg-gray-50' 
              : 'border-blue-300 bg-blue-50'
          }`}
        >
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
