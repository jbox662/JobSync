import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import JobsScreen from '../screens/JobsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import PartsScreen from '../screens/PartsScreen';
import LaborScreen from '../screens/LaborScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CreateJobScreen from '../screens/CreateJobScreen';
import CreateCustomerScreen from '../screens/CreateCustomerScreen';
import CreatePartScreen from '../screens/CreatePartScreen';
import CreateLaborScreen from '../screens/CreateLaborScreen';

export type RootTabParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Customers: undefined;
  Parts: undefined;
  Labor: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  JobDetail: { jobId: string };
  CustomerDetail: { customerId: string };
  CreateJob: { customerId?: string };
  CreateCustomer: undefined;
  CreatePart: undefined;
  CreateLabor: undefined;
  EditJob: { jobId: string };
  EditCustomer: { customerId: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Jobs':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'Customers':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Parts':
              iconName = focused ? 'construct' : 'construct-outline';
              break;
            case 'Labor':
              iconName = focused ? 'time' : 'time-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
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
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Jobs" component={JobsScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Parts" component={PartsScreen} />
      <Tab.Screen name="Labor" component={LaborScreen} />
    </Tab.Navigator>
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
        component={TabNavigator} 
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
        name="CreateJob" 
        component={CreateJobScreen}
        options={{ title: 'New Job', presentation: 'modal' }}
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