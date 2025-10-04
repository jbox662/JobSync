import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useJobStore } from '../state/store';
import { Invoice, JobItem, Customer } from '../types';
import AttachmentManager from '../components/AttachmentManager';

type EditInvoiceRouteProp = RouteProp<{ EditInvoice: { invoiceId: string } }, 'EditInvoice'>;

const EditInvoiceScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<EditInvoiceRouteProp>();
  const { invoiceId } = route.params;

  const { 
    getInvoiceById, 
    updateInvoice, 
    customers, 
    getCustomerById,
    deleteInvoice,
    settings,
    workspaceId
  } = useJobStore();

  const invoice = getInvoiceById(invoiceId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState<Invoice['status']>('draft');
  const [items, setItems] = useState<JobItem[]>([]);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    name: string;
    uri: string;
    size: number;
    type: string;
  }>>([]);

  useEffect(() => {
    if (invoice) {
      setTitle(invoice.title);
      setDescription(invoice.description || '');
      setCustomerId(invoice.customerId);
      setStatus(invoice.status);
      setItems(invoice.items || []);
      setNotes(invoice.notes || '');
      setDueDate(invoice.dueDate);
      setPaymentTerms(invoice.paymentTerms || '');
      setTaxRate(invoice.taxRate || 0);
      setAttachments(invoice.attachments || []);
    }
  }, [invoice]);

  if (!invoice) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-gray-500">Invoice not found</Text>
      </View>
    );
  }

  const selectedCustomer = getCustomerById(customerId);

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const addItem = () => {
    const newItem: JobItem = {
      id: Date.now().toString(),
      type: 'labor',
      description: '',
      quantity: 1,
      price: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof JobItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'price') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].price;
    }
    
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an invoice title');
      return;
    }

    if (!customerId) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    const updatedInvoice: Partial<Invoice> = {
      title: title.trim(),
      description: description.trim(),
      customerId,
      status,
      items,
      subtotal,
      tax,
      taxRate,
      total,
      notes: notes.trim(),
      dueDate,
      paymentTerms: paymentTerms.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      updatedAt: new Date().toISOString(),
    };

    updateInvoice(invoiceId, updatedInvoice);
    Alert.alert('Success', 'Invoice updated successfully', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteInvoice(invoiceId);
            Alert.alert('Deleted', 'Invoice deleted successfully', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }
        }
      ]
    );
  };

  const statusOptions: { value: Invoice['status']; label: string; color: string }[] = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800' },
    { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
    { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  ];

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Edit Invoice</Text>
        </View>
        <View className="flex-row items-center">
          <Pressable onPress={handleDelete} className="mr-3 p-2">
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </Pressable>
          <Pressable onPress={handleSave} className="bg-blue-600 px-4 py-2 rounded-lg">
            <Text className="text-white font-medium">Save</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Basic Info */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Enter invoice title"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Enter description (optional)"
                multiline
                numberOfLines={3}
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            {/* Customer Selection */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Customer *</Text>
              <Pressable
                onPress={() => setShowCustomerPicker(!showCustomerPicker)}
                className="border border-gray-300 rounded-lg px-3 py-2 flex-row items-center justify-between"
              >
                <Text className={selectedCustomer ? "text-gray-900" : "text-gray-500"}>
                  {selectedCustomer ? `${selectedCustomer.company || selectedCustomer.name}` : "Select customer"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </Pressable>
              
              {showCustomerPicker && (
                <View className="border border-gray-200 rounded-lg mt-2 bg-white max-h-40">
                  <ScrollView>
                    {customers.map((customer) => (
                      <Pressable
                        key={customer.id}
                        onPress={() => {
                          setCustomerId(customer.id);
                          setShowCustomerPicker(false);
                        }}
                        className="px-3 py-2 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">
                          {customer.company || customer.name}
                        </Text>
                        {customer.company && (
                          <Text className="text-gray-600 text-sm">{customer.name}</Text>
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Status */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {statusOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setStatus(option.value)}
                      className={`px-3 py-2 rounded-full mr-2 ${
                        status === option.value ? option.color : 'bg-gray-100'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        status === option.value ? option.color.split(' ')[1] : 'text-gray-600'
                      }`}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Items */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">Items</Text>
              <Pressable onPress={addItem} className="bg-blue-600 px-3 py-2 rounded-lg">
                <Text className="text-white font-medium">Add Item</Text>
              </Pressable>
            </View>

            {items.map((item, index) => (
              <View key={item.id} className="border border-gray-200 rounded-lg p-3 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-medium text-gray-900">Item {index + 1}</Text>
                  <Pressable onPress={() => removeItem(index)}>
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </Pressable>
                </View>

                <TextInput
                  value={item.description}
                  onChangeText={(value) => updateItem(index, 'description', value)}
                  placeholder="Item description"
                  className="border border-gray-300 rounded-lg px-3 py-2 mb-2 text-gray-900"
                />

                <View className="flex-row space-x-2">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600 mb-1">Quantity</Text>
                    <TextInput
                      value={(item.quantity || 0).toString()}
                      onChangeText={(value) => updateItem(index, 'quantity', parseFloat(value) || 0)}
                      placeholder="0"
                      keyboardType="numeric"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600 mb-1">Price</Text>
                    <TextInput
                      value={(item.price || 0).toString()}
                      onChangeText={(value) => updateItem(index, 'price', parseFloat(value) || 0)}
                      placeholder="0.00"
                      keyboardType="numeric"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600 mb-1">Total</Text>
                    <View className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                      <Text className="text-gray-900">${item.total.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Additional Details */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Additional Details</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Due Date</Text>
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Payment Terms</Text>
              <TextInput
                value={paymentTerms}
                onChangeText={setPaymentTerms}
                placeholder="e.g., Net 30"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</Text>
              <TextInput
                value={(taxRate || 0).toString()}
                onChangeText={(value) => setTaxRate(parseFloat(value) || 0)}
                placeholder="0"
                keyboardType="numeric"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes (optional)"
                multiline
                numberOfLines={3}
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>
          </View>

          {/* Attachments */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <AttachmentManager
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            maxAttachments={5}
            enableSync={true}
            workspaceId={workspaceId}
            documentType="invoice"
            documentId={invoice?.invoiceNumber || ''}
            settings={settings}
          />
          </View>

          {/* Totals */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Totals</Text>
            
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">Subtotal:</Text>
              <Text className="text-gray-900 font-medium">${subtotal.toFixed(2)}</Text>
            </View>
            
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">Tax ({taxRate}%):</Text>
              <Text className="text-gray-900 font-medium">${tax.toFixed(2)}</Text>
            </View>
            
            <View className="border-t border-gray-200 pt-2">
              <View className="flex-row justify-between">
                <Text className="text-lg font-semibold text-gray-900">Total:</Text>
                <Text className="text-lg font-semibold text-gray-900">${total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditInvoiceScreen;
