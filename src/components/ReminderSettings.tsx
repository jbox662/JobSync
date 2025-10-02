import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ReminderSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
}

interface ReminderSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (settings: ReminderSettings) => void;
  initialSettings?: ReminderSettings;
}

const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialSettings = { enabled: false, frequency: 'weekly' }
}) => {
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [frequency, setFrequency] = useState(initialSettings.frequency);

  const handleConfirm = () => {
    onConfirm({ enabled, frequency });
  };

  const frequencyOptions = [
    { value: 'daily' as const, label: 'Daily', description: 'Send reminder every day' },
    { value: 'weekly' as const, label: 'Weekly', description: 'Send reminder every week' },
    { value: 'biweekly' as const, label: 'Bi-weekly', description: 'Send reminder every 2 weeks' },
    { value: 'monthly' as const, label: 'Monthly', description: 'Send reminder every month' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black bg-opacity-50 justify-center items-center px-4">
        <View className="bg-white rounded-xl p-4 w-full max-w-md mx-auto">
          <Text className="text-lg font-bold text-gray-900 mb-4">Payment Reminders</Text>
          
          {/* Enable Toggle */}
          <View className="mb-4">
            <Pressable
              onPress={() => setEnabled(!enabled)}
              className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <View>
                <Text className="text-base font-medium text-gray-900">Enable Reminders</Text>
                <Text className="text-sm text-gray-600">Send automatic payment reminders</Text>
              </View>
              <View className={`w-12 h-6 rounded-full ${enabled ? 'bg-blue-600' : 'bg-gray-300'} flex-row items-center`}>
                <View className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${enabled ? 'ml-6' : 'ml-0.5'}`} />
              </View>
            </Pressable>
          </View>

          {/* Frequency Selection */}
          {enabled && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Reminder Frequency</Text>
              <View className="space-y-2">
                {frequencyOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setFrequency(option.value)}
                    className={`flex-row items-center p-2 rounded-lg ${
                      frequency === option.value ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      frequency === option.value 
                        ? 'border-blue-600 bg-blue-600' 
                        : 'border-gray-300'
                    } items-center justify-center`}>
                      {frequency === option.value && (
                        <View className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className={`font-medium ${
                        frequency === option.value ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </Text>
                      <Text className={`text-xs ${
                        frequency === option.value ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {option.description}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row space-x-2">
            <Pressable
              onPress={onClose}
              className="flex-1 p-3 rounded-lg bg-gray-100"
            >
              <Text className="text-gray-700 font-medium text-center">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              className="flex-1 p-3 rounded-lg bg-blue-600"
            >
              <Text className="text-white font-medium text-center">Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ReminderSettingsModal;
