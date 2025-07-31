import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem('job-management-store');
    console.log('All data cleared successfully');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};