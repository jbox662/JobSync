import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { ImportExportService } from '../services/importExport';

const ImportExportScreen = () => {
  const navigation = useNavigation();
  const { laborItems, jobs, customers, addLaborItem, addJob, addCustomer } = useJobStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const success = await ImportExportService.exportData(laborItems, jobs, customers);
      if (success) {
        Alert.alert('Export Complete', 'All data has been exported successfully!');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportLabor = async () => {
    setIsExporting(true);
    try {
      const success = await ImportExportService.exportLaborItems(laborItems);
      if (success) {
        Alert.alert('Export Complete', 'Labor items have been exported successfully!');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export labor items. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJobs = async () => {
    setIsExporting(true);
    try {
      const success = await ImportExportService.exportJobs(jobs);
      if (success) {
        Alert.alert('Export Complete', 'Jobs have been exported successfully!');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export jobs. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Import Data',
      'This will import data from a JobSync export file. Existing data will not be overwritten.\n\nDo you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            setIsImporting(true);
            try {
              const importData = await ImportExportService.getImportData();
              if (importData) {
                let importedCount = 0;
                const errors: string[] = [];

                // Import customers first (jobs depend on them)
                for (const customer of importData.customers) {
                  try {
                    addCustomer(customer);
                    importedCount++;
                  } catch (error) {
                    errors.push(`Failed to import customer: ${customer.name}`);
                  }
                }

                // Import labor items
                for (const laborItem of importData.laborItems) {
                  try {
                    addLaborItem(laborItem);
                    importedCount++;
                  } catch (error) {
                    errors.push(`Failed to import labor item: ${laborItem.description}`);
                  }
                }

                // Import jobs
                for (const job of importData.jobs) {
                  try {
                    addJob(job);
                    importedCount++;
                  } catch (error) {
                    errors.push(`Failed to import job: ${job.title}`);
                  }
                }

                if (errors.length > 0) {
                  Alert.alert(
                    'Import Complete with Errors',
                    `Imported ${importedCount} items successfully.\n\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''}`
                  );
                } else {
                  Alert.alert('Import Complete', `Successfully imported ${importedCount} items!`);
                }
              } else {
                Alert.alert('Import Failed', 'No valid data found in the selected file.');
              }
            } catch (error) {
              Alert.alert('Import Failed', 'Failed to import data. Please check the file format.');
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  const ActionButton = ({ 
    title, 
    description, 
    icon, 
    onPress, 
    loading = false,
    color = 'blue' 
  }: {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    loading?: boolean;
    color?: string;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className={`bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100 ${
        loading ? 'opacity-50' : ''
      }`}
    >
      <View className="flex-row items-center">
        <View className={`w-12 h-12 rounded-full items-center justify-center bg-${color}-100 mr-4`}>
          {loading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Ionicons name={icon} size={24} color="#3B82F6" />
          )}
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-lg">{title}</Text>
          <Text className="text-gray-600 text-sm mt-1">{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Import & Export</Text>
          <Text className="text-gray-600">
            Backup your data or import from other JobSync installations
          </Text>
        </View>

        {/* Export Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Export Data</Text>
          
          <ActionButton
            title="Export All Data"
            description={`Export ${laborItems.length} labor items, ${jobs.length} jobs, and ${customers.length} customers`}
            icon="download-outline"
            onPress={handleExportAll}
            loading={isExporting}
            color="green"
          />

          <ActionButton
            title="Export Labor Items"
            description={`Export ${laborItems.length} labor items only`}
            icon="construct-outline"
            onPress={handleExportLabor}
            loading={isExporting}
            color="blue"
          />

          <ActionButton
            title="Export Jobs"
            description={`Export ${jobs.length} jobs only`}
            icon="briefcase-outline"
            onPress={handleExportJobs}
            loading={isExporting}
            color="purple"
          />
        </View>

        {/* Import Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Import Data</Text>
          
          <ActionButton
            title="Import from File"
            description="Import data from a JobSync export file"
            icon="cloud-upload-outline"
            onPress={handleImport}
            loading={isImporting}
            color="orange"
          />
        </View>

        {/* Info Section */}
        <View className="bg-blue-50 rounded-xl p-4 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-blue-900 mb-2">How it works</Text>
              <Text className="text-blue-800 text-sm leading-5">
                • Export creates a JSON file with all your data{'\n'}
                • Import adds data from export files (won't overwrite existing){'\n'}
                • Use this to backup your data or migrate between devices{'\n'}
                • Files are saved in standard JSON format for compatibility
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ImportExportScreen;
