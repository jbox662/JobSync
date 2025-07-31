import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerNavigationProp } from '@react-navigation/drawer';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import JobsScreen from '../screens/JobsScreen';
import QuotesScreen from '../screens/QuotesScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import CustomersScreen from '../screens/CustomersScreen';
import PartsScreen from '../screens/PartsScreen';
import LaborScreen from '../screens/LaborScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CreateQuoteScreen from '../screens/CreateQuoteScreen';
import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import CreateCustomerScreen from '../screens/CreateCustomerScreen';
import CreatePartScreen from '../screens/CreatePartScreen';
import CreateLaborScreen from '../screens/CreateLaborScreen';

export type RootDrawerParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Quotes: undefined;
  Invoices: undefined;
  Customers: undefined;
  Parts: undefined;
  Labor: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  JobDetail: { jobId: string };
  CustomerDetail: { customerId: string };
  CreateQuote: { customerId?: string };
  CreateInvoice: { customerId?: string };
  CreateCustomer: undefined;
  CreatePart: undefined;
  CreateLabor: undefined;
  EditJob: { jobId: string };
  EditCustomer: { customerId: string };
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const CustomDrawerContent = (props: any) => {
  const insets = useSafeAreaInsets();
  
  const menuItems = [
    { name: 'Dashboard', icon: 'home-outline', label: 'Dashboard' },
    { name: 'Jobs', icon: 'briefcase-outline', label: 'Jobs' },
    { name: 'Quotes', icon: 'document-text-outline', label: 'Quotes' },
    { name: 'Invoices', icon: 'receipt-outline', label: 'Invoices' },
    { name: 'Customers', icon: 'people-outline', label: 'Customers' },
    { name: 'Parts', icon: 'construct-outline', label: 'Parts' },
    { name: 'Labor', icon: 'time-outline', label: 'Labor' },
  ];

  return (
    <View className="flex-1 bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-6 py-8 border-b border-gray-700">
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-blue-600 rounded-xl items-center justify-center mr-3">
            <Ionicons name="briefcase" size={24} color="white" />
          </View>
          <View>
            <Text className="text-white text-xl font-bold">Job Manager</Text>
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
      <View className="px-6 py-6 border-t border-gray-700">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-gray-700 rounded-full items-center justify-center mr-3">
            <Ionicons name="person" size={20} color="#9CA3AF" />
          </View>
          <View>
            <Text className="text-gray-300 font-medium">User Account</Text>
            <Text className="text-gray-500 text-sm">Professional Plan</Text>
          </View>
        </View>
      </View>
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
        drawerType: 'slide',
        drawerStyle: {
          width: 280,
        },
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
        name="CreatePart" 
        component={CreatePartScreen}
        options={{ title: 'New Part', presentation: 'modal' }}
      />
      <Stack.Screen 
        name="CreateLabor" 
        component={CreateLaborScreen}
        options={{ title: 'New Labor Item', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
};