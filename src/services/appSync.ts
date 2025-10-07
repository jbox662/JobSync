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

  // Sync from server - pulls all data from server to update local
  async syncFromServer(): Promise<void> {
    try {
      const state = useJobStore.getState();
      
      if (!state.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const { authenticatedUser, currentUserId, syncNow } = state;
      const userId = authenticatedUser?.id || currentUserId;
      
      if (!userId) {
        throw new Error('No user ID found');
      }

      console.log('🔄 Syncing from server - clearing local data and pulling fresh from database');

      // Clear ALL local data first
      const workspaceId = state.workspaceId;
      if (workspaceId) {
        useJobStore.setState({
          // Clear workspace data
          dataByWorkspace: {
            ...state.dataByWorkspace,
            [workspaceId]: {
              customers: [],
              parts: [],
              laborItems: [],
              jobs: [],
              quotes: [],
              invoices: []
            }
          },
          // Clear top-level data
          customers: [],
          parts: [],
          laborItems: [],
          jobs: [],
          quotes: [],
          invoices: [],
          // Clear outbox
          outboxByUser: {
            ...state.outboxByUser,
            [userId]: []
          },
          // Clear last sync to force full pull
          lastSyncByUser: { 
            ...state.lastSyncByUser, 
            [userId]: null 
          }
        });
      }

      // Pull everything from server to update local data
      await syncNow();
      
      console.log('✅ Sync from server completed - local data updated from database');
    } catch (error) {
      console.error('Sync from server failed:', error);
      throw error;
    }
  }

  // Push all local data to server
  async pushAllToServer(): Promise<void> {
    try {
      const state = useJobStore.getState();
      
      if (!state.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const { authenticatedUser, currentUserId, dataByUser, dataByWorkspace, workspaceId, syncNow } = state;
      const userId = authenticatedUser?.id || currentUserId;
      
      if (!userId || !workspaceId) {
        throw new Error('No user ID or workspace ID found');
      }

      // Get all local data for this workspace
      let localData = dataByWorkspace?.[workspaceId];
      if (!localData && dataByUser?.[userId]) {
        // Fallback to user data for migration
        localData = dataByUser[userId];
      }
      
      if (!localData) {
        throw new Error('No local data found');
      }

      console.log('🔄 Pushing all local data to server');

      // Rebuild outbox with ALL local data
      const fullOutbox: any[] = [];

      // Add all customers
      (localData.customers || []).forEach(customer => {
        fullOutbox.push({
          id: `push-all-${customer.id}`,
          entity: 'customers',
          operation: 'create',
          row: customer,
          updatedAt: customer.updatedAt || customer.createdAt,
          deletedAt: null
        });
      });

      // Add all parts
      (localData.parts || []).forEach(part => {
        fullOutbox.push({
          id: `push-all-${part.id}`,
          entity: 'parts',
          operation: 'create',
          row: part,
          updatedAt: part.updatedAt || part.createdAt,
          deletedAt: null
        });
      });

      // Add all labor items
      (localData.laborItems || []).forEach(item => {
        fullOutbox.push({
          id: `push-all-${item.id}`,
          entity: 'laborItems',
          operation: 'create',
          row: item,
          updatedAt: item.updatedAt || item.createdAt,
          deletedAt: null
        });
      });

      // Add all jobs
      (localData.jobs || []).forEach(job => {
        fullOutbox.push({
          id: `push-all-${job.id}`,
          entity: 'jobs',
          operation: 'create',
          row: job,
          updatedAt: job.updatedAt || job.createdAt,
          deletedAt: null
        });
      });

      // Add all quotes
      (localData.quotes || []).forEach(quote => {
        fullOutbox.push({
          id: `push-all-${quote.id}`,
          entity: 'quotes',
          operation: 'create',
          row: quote,
          updatedAt: quote.updatedAt || quote.createdAt,
          deletedAt: null
        });
      });

      // Add all invoices
      (localData.invoices || []).forEach(invoice => {
        fullOutbox.push({
          id: `push-all-${invoice.id}`,
          entity: 'invoices',
          operation: 'create',
          row: invoice,
          updatedAt: invoice.updatedAt || invoice.createdAt,
          deletedAt: null
        });
      });

      console.log(`📦 Pushing ${fullOutbox.length} items to server`);

      // Replace the outbox with all local data
      useJobStore.setState({
        outboxByUser: {
          ...state.outboxByUser,
          [userId]: fullOutbox
        }
      });

      // Push everything to server
      await syncNow();
      
      console.log('✅ Push all completed - all local data sent to server');
    } catch (error) {
      console.error('Push all to server failed:', error);
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
