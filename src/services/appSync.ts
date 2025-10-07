import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import { useJobStore } from '../state/store';

class AppSyncService {
  private static instance: AppSyncService;
  private isInitialized = false;
  private lastSyncTime: number = 0;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private appStateSubscription: NativeEventSubscription | null = null;

  static getInstance(): AppSyncService {
    if (!AppSyncService.instance) {
      AppSyncService.instance = new AppSyncService();
    }
    return AppSyncService.instance;
  }

  initialize() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    
    // Listen for app state changes - store the subscription
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    // Initial sync when app starts
    this.performFullSync();
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground, perform full sync
      this.performFullSync();
    }
  };

  private async performFullSync() {
    const now = Date.now();
    
    // Throttle sync requests - don't sync more than once every 5 minutes
    if (now - this.lastSyncTime < this.SYNC_INTERVAL) {
      return;
    }

    this.lastSyncTime = now;

    try {
      const { syncNow, isAuthenticated } = useJobStore.getState();
      
      // Only sync if user is authenticated
      if (!isAuthenticated) {
        return;
      }

      // Force full sync by clearing lastSyncByUser
      const state = useJobStore.getState();
      const { authenticatedUser, currentUserId } = state;
      const userId = authenticatedUser?.id || currentUserId;
      
      if (!userId) return;

      // Clear last sync to force full sync
      state.lastSyncByUser = { 
        ...state.lastSyncByUser, 
        [userId]: null 
      };

      await syncNow();
      console.log('Automatic full sync completed');
    } catch (error) {
      console.error('Automatic sync failed:', error);
    }
  }

  // Manual sync method for settings
  async manualFullSync(): Promise<void> {
    try {
      const { syncNow, isAuthenticated } = useJobStore.getState();
      
      if (!isAuthenticated) {
        throw new Error('User not authenticated');
      }

      // Force full sync by clearing lastSyncByUser
      const state = useJobStore.getState();
      const { authenticatedUser, currentUserId } = state;
      const userId = authenticatedUser?.id || currentUserId;
      
      if (!userId) {
        throw new Error('No user ID found');
      }

      // Clear last sync to force full sync
      state.lastSyncByUser = { 
        ...state.lastSyncByUser, 
        [userId]: null 
      };

      await syncNow();
    } catch (error) {
      console.error('Manual full sync failed:', error);
      throw error;
    }
  }

  cleanup() {
    // Use the new React Native API - call remove() on the subscription
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isInitialized = false;
  }
}

export const appSyncService = AppSyncService.getInstance();
