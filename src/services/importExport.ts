import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { LaborItem, Job, Customer } from '../types';

export interface ExportData {
  laborItems: LaborItem[];
  jobs: Job[];
  customers: Customer[];
  exportDate: string;
  version: string;
}

export interface ImportResult {
  success: boolean;
  imported: {
    laborItems: number;
    jobs: number;
    customers: number;
  };
  errors: string[];
}

export class ImportExportService {
  private static readonly EXPORT_VERSION = '1.0';

  /**
   * Export labor items and jobs to JSON file
   */
  static async exportData(
    laborItems: LaborItem[],
    jobs: Job[],
    customers: Customer[]
  ): Promise<boolean> {
    try {
      const exportData: ExportData = {
        laborItems,
        jobs,
        customers,
        exportDate: new Date().toISOString(),
        version: this.EXPORT_VERSION,
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `jobsync-export-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export JobSync Data',
        });
        return true;
      } else {
        Alert.alert('Export Complete', `Data exported to: ${fileName}`);
        return true;
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
      return false;
    }
  }

  /**
   * Import labor items and jobs from JSON file
   */
  static async importData(): Promise<ImportResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return {
          success: false,
          imported: { laborItems: 0, jobs: 0, customers: 0 },
          errors: ['Import cancelled'],
        };
      }

      const fileUri = result.assets[0].uri;
      const jsonString = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const importData: ExportData = JSON.parse(jsonString);

      // Validate data structure
      if (!importData.laborItems || !importData.jobs || !importData.customers) {
        return {
          success: false,
          imported: { laborItems: 0, jobs: 0, customers: 0 },
          errors: ['Invalid file format. Expected JobSync export file.'],
        };
      }

      return {
        success: true,
        imported: {
          laborItems: importData.laborItems.length,
          jobs: importData.jobs.length,
          customers: importData.customers.length,
        },
        errors: [],
      };
    } catch (error) {
      console.error('Import error:', error);
      return {
        success: false,
        imported: { laborItems: 0, jobs: 0, customers: 0 },
        errors: ['Failed to read file. Please check the file format.'],
      };
    }
  }

  /**
   * Get parsed import data for processing
   */
  static async getImportData(): Promise<ExportData | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return null;
      }

      const fileUri = result.assets[0].uri;
      const jsonString = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const importData: ExportData = JSON.parse(jsonString);

      // Validate data structure
      if (!importData.laborItems || !importData.jobs || !importData.customers) {
        throw new Error('Invalid file format');
      }

      return importData;
    } catch (error) {
      console.error('Get import data error:', error);
      return null;
    }
  }

  /**
   * Export only labor items
   */
  static async exportLaborItems(laborItems: LaborItem[]): Promise<boolean> {
    try {
      const exportData = {
        laborItems,
        exportDate: new Date().toISOString(),
        version: this.EXPORT_VERSION,
        type: 'labor-items',
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `jobsync-labor-export-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Labor Items',
        });
        return true;
      } else {
        Alert.alert('Export Complete', `Labor items exported to: ${fileName}`);
        return true;
      }
    } catch (error) {
      console.error('Export labor items error:', error);
      Alert.alert('Export Failed', 'Failed to export labor items. Please try again.');
      return false;
    }
  }

  /**
   * Export only jobs
   */
  static async exportJobs(jobs: Job[]): Promise<boolean> {
    try {
      const exportData = {
        jobs,
        exportDate: new Date().toISOString(),
        version: this.EXPORT_VERSION,
        type: 'jobs',
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `jobsync-jobs-export-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Jobs',
        });
        return true;
      } else {
        Alert.alert('Export Complete', `Jobs exported to: ${fileName}`);
        return true;
      }
    } catch (error) {
      console.error('Export jobs error:', error);
      Alert.alert('Export Failed', 'Failed to export jobs. Please try again.');
      return false;
    }
  }
}