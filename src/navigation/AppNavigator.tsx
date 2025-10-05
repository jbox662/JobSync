import React, { useState } from 'react';
import { View, Text, Pressable, Alert, Modal } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useJobStore } from '../state/store';
import { authService } from '../services/auth';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import CreateBusinessScreen from '../screens/CreateBusinessScreen';
import JoinBusinessScreen from '../screens/JoinBusinessScreen';
import EditInvoiceScreen from '../screens/EditInvoiceScreen';
import ManageTeamScreen from '../screens/ManageTeamScreen';
import JobsScreen from '../screens/JobsScreen';
import QuotesScreen from '../screens/QuotesScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import CustomersScreen from '../screens/CustomersScreen';
import PartsScreen from '../screens/PartsScreen';
import LaborScreen from '../screens/LaborScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CreateJobScreen from '../screens/CreateJobScreen';
import CreateQuoteScreen from '../screens/CreateQuoteScreen';
import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import CreateCustomerScreen from '../screens/CreateCustomerScreen';
import EditCustomerScreen from '../screens/EditCustomerScreen';
import QuoteDetailScreen from '../screens/QuoteDetailScreen';
import EditQuoteScreen from '../screens/EditQuoteScreen';
import InvoiceDetailScreen from '../screens/InvoiceDetailScreen';
import PartDetailScreen from '../screens/PartDetailScreen';
import LaborDetailScreen from '../screens/LaborDetailScreen';
import EditJobScreen from '../screens/EditJobScreen';
import CreatePartScreen from '../screens/CreatePartScreen';
import CreateLaborScreen from '../screens/CreateLaborScreen';
import EditLaborScreen from '../screens/EditLaborScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DebugScreen from '../screens/DebugScreen';

export type RootDrawerParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Quotes: undefined;
  Invoices: undefined;
  Customers: undefined;
  Parts: undefined;
  Labor: undefined;
  Settings: undefined;
  Debug: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  CreateBusiness: undefined;
  JoinBusiness: undefined;
  JobDetail: { jobId: string };
  CustomerDetail: { customerId: string };
  QuoteDetail: { quoteId: string };
  InvoiceDetail: { invoiceId: string };
  PartDetail: { partId: string };
  LaborDetail: { laborId: string };
  CreateQuote: { customerId?: string; jobId?: string };
  EditQuote: { quoteId: string };
  EditInvoice: { invoiceId: string };
  EditJob: { jobId: string };
  EditPart: { partId: string };
  EditLabor: { laborId: string };
  CreateInvoice: { customerId?: string; quoteId?: string };
  CreateJob: { customerId?: string };
  CreateCustomer: undefined;
  EditCustomer: { customerId: string };
  CreatePart: undefined;
  CreateLabor: undefined;
  ManageTeam: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const OnbStack = createNativeStackNavigator();



const CustomDrawerContent = (props: any) => {
  const insets = useSafeAreaInsets();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { authenticatedUser, workspaceName } = useJobStore();
  
  const menuItems = [
    { name: 'Dashboard', icon: 'home-outline', label: 'Dashboard' },
    { name: 'Jobs', icon: 'briefcase-outline', label: 'Jobs' },
    { name: 'Quotes', icon: 'document-text-outline', label: 'Quotes' },
    { name: 'Invoices', icon: 'receipt-outline', label: 'Invoices' },
    { name: 'Customers', icon: 'people-outline', label: 'Customers' },
    { name: 'Parts', icon: 'construct-outline', label: 'Parts' },
    { name: 'Labor', icon: 'time-outline', label: 'Labor' },
    { name: 'Settings', icon: 'settings-outline', label: 'Settings' },
  ];

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            setShowUserMenu(false);
            await authService.signOut();
          }
        }
      ]
    );
  };

  return (
    <View 
      className="flex-1 bg-gray-900" 
      style={{ 
        paddingTop: insets.top,
        width: 280,
        height: '100%'
      }}
    >
      {/* Header */}
      <View className="px-6 py-8 border-b border-gray-700">
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-blue-600 rounded-xl items-center justify-center mr-3">
            <Ionicons name="briefcase" size={24} color="white" />
          </View>
          <View>
            <Text className="text-white text-xl font-bold">JobSync</Text>
            <Text className="text-gray-400 text-sm">Professional Edition</Text>
          </View>
        </View>
      </View>

      <DrawerContentScrollView 
        {...props}
        contentContainerStyle={{ paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4">
          {menuItems.map((item) => {
            const isActive = props.state.routeNames[props.state.index] === item.name;
            
            return (
              <Pressable
                key={item.name}
                onPress={() => props.navigation.navigate(item.name)}
                className={`flex-row items-center px-4 py-4 rounded-xl mb-2 ${
                  isActive ? 'bg-blue-600' : 'bg-transparent'
                }`}
              >
                <Ionicons 
                  name={item.icon as keyof typeof Ionicons.glyphMap} 
                  size={22} 
                  color={isActive ? 'white' : '#9CA3AF'} 
                />
                <Text className={`ml-4 text-lg font-medium ${
                  isActive ? 'text-white' : 'text-gray-300'
                }`}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Footer */}
      <View className="px-4 py-4 border-t border-gray-700 bg-gray-900" style={{ width: 280 }}>
        {/* User Info - Clickable */}
        <Pressable 
          onPress={() => setShowUserMenu(true)}
          className="flex-row items-center p-2 rounded-lg active:bg-gray-800"
        >
          <View className="w-10 h-10 bg-gray-700 rounded-full items-center justify-center mr-3">
            <Ionicons name="person" size={20} color="#9CA3AF" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-300 font-medium text-sm" numberOfLines={1}>
              {authenticatedUser?.name || 'Account'}
            </Text>
            <Text className="text-gray-500 text-xs" numberOfLines={1}>
              {workspaceName || 'Business Account'}
            </Text>
          </View>
          <Ionicons name="chevron-up" size={16} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* User Menu Modal */}
      <Modal
        visible={showUserMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <Pressable 
          className="flex-1 bg-black bg-opacity-50 justify-center items-center"
          onPress={() => setShowUserMenu(false)}
        >
          <View className="bg-white rounded-xl p-6 mx-4 w-80 max-w-sm">
            <Text className="text-xl font-bold text-gray-900 mb-4">Account Menu</Text>
            
            <View className="mb-4">
              <Text className="text-gray-600 text-sm">Signed in as:</Text>
              <Text className="text-gray-900 font-medium">{authenticatedUser?.email}</Text>
              <Text className="text-gray-600 text-sm mt-1">Workspace: {workspaceName}</Text>
            </View>

            <View className="space-y-2">
              <Pressable
                onPress={() => {
                  setShowUserMenu(false);
                  props.navigation.navigate('Settings');
                }}
                className="flex-row items-center p-3 rounded-lg bg-gray-50"
              >
                <Ionicons name="settings-outline" size={20} color="#374151" />
                <Text className="ml-3 text-gray-900 font-medium">Account Settings</Text>
              </Pressable>

              <Pressable
                onPress={handleSignOut}
                className="flex-row items-center p-3 rounded-lg bg-red-50"
              >
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                <Text className="ml-3 text-red-600 font-medium">Sign Out</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowUserMenu(false)}
                className="flex-row items-center justify-center p-3 rounded-lg bg-gray-100 mt-2"
              >
                <Text className="text-gray-600 font-medium">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          color: '#1F2937',
        },
        headerTintColor: '#1F2937',
        drawerType: 'front',
        drawerPosition: 'left',
        drawerHideStatusBarOnOpen: false,
        drawerStatusBarAnimation: 'slide',
        drawerStyle: {
          width: 280,
          backgroundColor: '#111827',
        },
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        sceneContainerStyle: {
          backgroundColor: '#FFFFFF',
        },
        drawerLockMode: undefined,
        swipeEnabled: true,
        swipeEdgeWidth: 50,
        headerLeft: () => (
          <Pressable
            onPress={() => (navigation as DrawerNavigationProp<RootDrawerParamList>).toggleDrawer()}
            className="ml-4 p-2"
          >
            <Ionicons name="menu" size={24} color="#1F2937" />
          </Pressable>
        ),
      })}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Drawer.Screen 
        name="Jobs" 
        component={JobsScreen}
        options={{ title: 'Jobs' }}
      />
      <Drawer.Screen 
        name="Quotes" 
        component={QuotesScreen}
        options={{ title: 'Quotes' }}
      />
      <Drawer.Screen 
        name="Invoices" 
        component={InvoicesScreen}
        options={{ title: 'Invoices' }}
      />
      <Drawer.Screen 
        name="Customers" 
        component={CustomersScreen}
        options={{ title: 'Customers' }}
      />
      <Drawer.Screen 
        name="Parts" 
        component={PartsScreen}
        options={{ title: 'Parts' }}
      />
      <Drawer.Screen 
        name="Labor" 
        component={LaborScreen}
        options={{ title: 'Labor' }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Drawer.Screen 
        name="Debug" 
        component={DebugScreen}
        options={{ title: 'Debug Info' }}
      />
    </Drawer.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerTintColor: '#1F2937',
      }}
>
      <Stack.Screen 
        name="Main" 
        component={DrawerNavigator} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="CreateBusiness" 
        component={CreateBusinessScreen}
        options={{ title: 'Create Business', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="JoinBusiness" 
        component={JoinBusinessScreen}
        options={{ title: 'Join Business', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="JobDetail" 
        component={JobDetailScreen}
        options={{ title: 'Job Details' }}
      />
      <Stack.Screen 
        name="CustomerDetail" 
        component={CustomerDetailScreen}
        options={{ title: 'Customer Details' }}
      />
      <Stack.Screen 
        name="CreateJob" 
        component={CreateJobScreen}
        options={{ title: 'New Job', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="CreateQuote" 
        component={CreateQuoteScreen}
        options={{ title: 'New Quote', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="CreateInvoice" 
        component={CreateInvoiceScreen}
        options={{ title: 'New Invoice', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="CreateCustomer" 
        component={CreateCustomerScreen}
        options={{ title: 'New Customer', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="EditCustomer" 
        component={EditCustomerScreen}
        options={{ title: 'Edit Customer', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="QuoteDetail" 
        component={QuoteDetailScreen}
        options={{ title: 'Quote Details' }}
      />
      <Stack.Screen 
        name="EditQuote" 
        component={EditQuoteScreen}
        options={{ title: 'Edit Quote', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="InvoiceDetail" 
        component={InvoiceDetailScreen}
        options={{ title: 'Invoice Details' }}
      />
      <Stack.Screen 
        name="EditInvoice" 
        component={EditInvoiceScreen}
        options={{ title: 'Edit Invoice', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="PartDetail" 
        component={PartDetailScreen}
        options={{ title: 'Part Details' }}
      />
      <Stack.Screen 
        name="LaborDetail" 
        component={LaborDetailScreen}
        options={{ title: 'Labor Details' }}
      />
      <Stack.Screen 
        name="EditJob" 
        component={EditJobScreen}
        options={{ title: 'Edit Job', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="CreatePart" 
        component={CreatePartScreen}
        options={{ title: 'New Part', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="CreateLabor" 
        component={CreateLaborScreen}
        options={{ title: 'New Labor Item', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="EditLabor" 
        component={EditLaborScreen}
        options={{ title: 'Edit Labor Item', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="ManageTeam" 
        component={ManageTeamScreen}
        options={{ title: 'Manage Team', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
};