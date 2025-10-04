import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import { JobItem } from '../types';
import AttachmentManager from '../components/AttachmentManager';

const CreateInvoiceScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { addInvoice, jobs, quotes, customers, parts, laborItems, getCustomerById, getPartById, getLaborItemById, getQuoteById, settings } = useJobStore();
  
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState((route.params as any)?.customerId || '');
  const [selectedQuote, setSelectedQuote] = useState((route.params as any)?.quoteId || '');
  const [taxRate, setTaxRate] = useState(settings.defaultTaxRate.toString());
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [items, setItems] = useState<JobItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<'part' | 'labor'>('part');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [convertFromQuote, setConvertFromQuote] = useState(!!((route.params as any)?.quoteId));
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    name: string;
    uri: string;
    size: number;
    type: string;
  }>>([]);

  // Get approved quotes for selection
  const availableQuotes = quotes.filter(quote => quote.status === 'approved');
  
  // Auto-fill from selected quote
  React.useEffect(() => {
    if (selectedQuote) {
      const quote = getQuoteById(selectedQuote);
      if (quote) {
        setTitle(quote.title);
        setDescription(quote.description || '');
        setSelectedCustomer(quote.customerId);
        setItems(quote.items);
        setTaxRate((quote.taxRate || 0).toString());
      }
    }
  }, [selectedQuote, getQuoteById]);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const tax = settings.enableTax ? subtotal * (parseFloat(taxRate) / 100) : 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const addItemToInvoice = () => {
    if (!selectedItemId || !quantity) {
      Alert.alert('Error', 'Please select an item and enter quantity');
      return;
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return;
    }

    let itemData;
    let unitPrice = 0;
    let description = '';

    if (selectedItemType === 'part') {
      itemData = getPartById(selectedItemId);
      if (itemData) {
        unitPrice = itemData.unitPrice;
        description = itemData.name;
      }
    } else {
      itemData = getLaborItemById(selectedItemId);
      if (itemData) {
        unitPrice = itemData.hourlyRate;
        description = itemData.description;
      }
    }

    if (!itemData) {
      Alert.alert('Error', 'Item not found');
      return;
    }

    const newItem: JobItem = {
      id: Date.now().toString(),
      type: selectedItemType,
      itemId: selectedItemId,
      quantity: qty,
      unitPrice,
      total: qty * unitPrice,
      description,
    };

    setItems([...items, newItem]);
    setSelectedItemId('');
    setQuantity('1');
    setShowAddItem(false);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const handleSave = () => {
    if (!title.trim() || !selectedCustomer || (!convertFromQuote && items.length === 0)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (convertFromQuote && !selectedQuote) {
      Alert.alert('Error', 'Please select a quote to convert');
      return;
    }

    // Parse due date if provided
    let dueDateISO: string | undefined;
    if (dueDate.trim()) {
      const date = parseDateString(dueDate.trim());
      if (!date) {
        Alert.alert('Error', 'Please enter a valid due date in MM/DD/YYYY format');
        return;
      }
      dueDateISO = date.toISOString();
    }

    const notes = `Payment Terms: ${paymentTerms}${convertFromQuote ? `\nConverted from Quote` : ''}`;

    addInvoice({
      jobId: undefined, // Can be linked to job later if needed
      quoteId: convertFromQuote ? selectedQuote : undefined,
      customerId: selectedCustomer,
      title: title.trim(),
      description: description.trim() || undefined,
      status: 'draft',
      items,
      taxRate: settings.enableTax ? parseFloat(taxRate) || 0 : 0,
      notes: notes || undefined,
      dueDate: dueDateISO,
      paymentTerms: paymentTerms || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    navigation.goBack();
  };

  const parseDateString = (dateStr: string): Date | null => {
    // Try multiple date parsing approaches
    let date = new Date(dateStr);

    // If that fails, try parsing MM/DD/YYYY format specifically
    if (isNaN(date.getTime())) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1; // JS months are 0-based
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      }
    }

    // Final validation
    if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 3000) {
      return null;
    }

    return date;
  };

  const availableItems = selectedItemType === 'part' ? parts : laborItems;

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1 p-4">
        {/* Invoice Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Create Invoice</Text>
          <Text className="text-gray-600">Generate a professional invoice for completed work</Text>
        </View>

        {/* Quote Selection Toggle */}
        <View className="mb-4">
          <View className="flex-row">
            <Pressable
              onPress={() => setConvertFromQuote(false)}
              className={`flex-1 py-3 px-4 rounded-l-lg border ${
                !convertFromQuote ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'
              }`}
            >
              <Text className={`text-center font-medium ${
                !convertFromQuote ? 'text-white' : 'text-gray-600'
              }`}>New Invoice</Text>
            </Pressable>
            <Pressable
              onPress={() => setConvertFromQuote(true)}
              className={`flex-1 py-3 px-4 rounded-r-lg border-t border-r border-b ${
                convertFromQuote ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'
              }`}
            >
              <Text className={`text-center font-medium ${
                convertFromQuote ? 'text-white' : 'text-gray-600'
              }`}>Convert from Quote</Text>
            </Pressable>
          </View>
        </View>

        {convertFromQuote && (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Select Quote to Convert</Text>
            
            <View className="border border-gray-300 rounded-lg bg-white max-h-40">
              {availableQuotes.length === 0 ? (
                <View className="p-3">
                  <Text className="text-gray-500">No quotes available</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {availableQuotes.map((quote) => {
                    const customer = getCustomerById(quote.customerId);
                    return (
                      <Pressable
                        key={quote.id}
                        onPress={() => setSelectedQuote(quote.id)}
                        className={`p-3 flex-row items-center justify-between border-b border-gray-100 ${selectedQuote === quote.id ? 'bg-green-50' : ''}`}
                      >
                        <View className="flex-row items-center">
                          <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                            selectedQuote === quote.id ? 'bg-green-600 border-green-600' : 'border-gray-400'
                          }`} />
                          <View>
                            <Text className="text-gray-900 font-medium">{quote.title}</Text>
                            <Text className="text-gray-500 text-sm">{customer?.name}</Text>
                          </View>
                        </View>
                        <Text className="text-green-600 font-semibold">
                          {formatCurrency(quote.total)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {/* Invoice Information */}
        <View className="bg-gray-50 rounded-lg p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</Text>
          
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-gray-700 font-medium mb-2">Invoice Number</Text>
              <TextInput
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder="INV-001"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-gray-700 font-medium mb-2">Due Date</Text>
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="MM/DD/YYYY"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Invoice Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter invoice title"
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {!convertFromQuote && (
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Customer *</Text>
              <View className="border border-gray-300 rounded-lg bg-white max-h-32">
                {customers.length === 0 ? (
                  <View className="p-3">
                    <Text className="text-gray-500">No customers available</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {customers.map((customer) => (
                      <Pressable
                        key={customer.id}
                        onPress={() => setSelectedCustomer(customer.id)}
                        className={`p-3 flex-row items-center border-b border-gray-100 ${selectedCustomer === customer.id ? 'bg-blue-50' : ''}`}
                      >
                        <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          selectedCustomer === customer.id ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                        }`} />
                        <View>
                          <Text className="text-gray-900 font-medium">{customer.name}</Text>
                          {customer.company && (
                            <Text className="text-gray-500 text-sm">{customer.company}</Text>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          )}

          {convertFromQuote && selectedCustomer && (
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Customer</Text>
              <View className="border border-gray-200 rounded-lg bg-gray-50 p-3">
                <Text className="text-gray-900 font-medium">
                  {getCustomerById(selectedCustomer)?.name}
                </Text>
                {getCustomerById(selectedCustomer)?.company && (
                  <Text className="text-gray-600 text-sm">
                    {getCustomerById(selectedCustomer)?.company}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Work Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the work performed"
              multiline
              numberOfLines={3}
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
            />
          </View>

          <View className="flex-row">
            <View className="flex-1 mr-2">
              <Text className="text-gray-700 font-medium mb-2">Payment Terms</Text>
              <TextInput
                value={paymentTerms}
                onChangeText={setPaymentTerms}
                placeholder="Net 30"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-gray-700 font-medium mb-2">Tax Rate (%)</Text>
              <TextInput
                value={taxRate}
                onChangeText={setTaxRate}
                placeholder="0"
                keyboardType="decimal-pad"
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Attachments Section */}
        <View className="bg-gray-50 rounded-lg p-4 mb-6">
          <AttachmentManager
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            maxAttachments={5}
            enableSync={true}
            workspaceId={settings.workspaceId}
            documentType="invoice"
            documentId={invoiceNumber} // Use invoice number as document ID
            settings={settings}
          />
        </View>

        {/* Items Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Invoice Items</Text>
            <Pressable
              onPress={() => setShowAddItem(true)}
              className="bg-green-600 rounded-lg px-4 py-2 flex-row items-center"
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-medium ml-1">Add Item</Text>
            </Pressable>
          </View>

          {items.length === 0 ? (
            <View className="bg-gray-50 rounded-lg p-6 items-center">
              <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">No items added yet</Text>
              <Text className="text-gray-400 text-sm">Add parts or labor charges to your invoice</Text>
            </View>
          ) : (
            <View className="space-y-2">
              {items.map((item) => (
                <View key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900">{item.description}</Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        {item.type === 'labor' ? 'Labor' : 'Part'} • {item.quantity} × {formatCurrency(item.unitPrice)}
                        {item.type === 'labor' ? ' per hour' : ''}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="font-bold text-gray-900 mr-3">{formatCurrency(item.total)}</Text>
                      <Pressable onPress={() => removeItem(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add Item Modal */}
          {showAddItem && (
            <View className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <Text className="font-semibold text-gray-900 mb-3">Add Item to Invoice</Text>
              
              <View className="flex-row mb-3">
                <Pressable
                  onPress={() => setSelectedItemType('part')}
                  className={`flex-1 py-2 px-4 rounded-l-lg border ${
                    selectedItemType === 'part' ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'
                  }`}
                >
                  <Text className={`text-center font-medium ${
                    selectedItemType === 'part' ? 'text-white' : 'text-gray-600'
                  }`}>Parts</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedItemType('labor')}
                  className={`flex-1 py-2 px-4 rounded-r-lg border-t border-r border-b ${
                    selectedItemType === 'labor' ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'
                  }`}
                >
                  <Text className={`text-center font-medium ${
                    selectedItemType === 'labor' ? 'text-white' : 'text-gray-600'
                  }`}>Labor</Text>
                </Pressable>
              </View>

              <View className="mb-3">
                <Text className="text-gray-700 font-medium mb-2">Select {selectedItemType === 'part' ? 'Part' : 'Labor'}</Text>
                <View className="border border-gray-300 rounded-lg bg-white max-h-24">
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {availableItems.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setSelectedItemId(item.id)}
                        className={`p-3 border-b border-gray-100 ${selectedItemId === item.id ? 'bg-green-50' : ''}`}
                      >
                        <Text className="text-gray-900">
                          {selectedItemType === 'part' ? (item as any).name : (item as any).description}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          {formatCurrency(selectedItemType === 'part' ? (item as any).unitPrice : (item as any).hourlyRate)}
                          {selectedItemType === 'labor' ? '/hour' : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-gray-700 font-medium mb-2">
                  {selectedItemType === 'labor' ? 'Hours' : 'Quantity'}
                </Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  keyboardType="decimal-pad"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
                />
              </View>

              <View className="flex-row">
                <Pressable
                  onPress={() => setShowAddItem(false)}
                  className="flex-1 py-2 px-4 rounded-lg border border-gray-300 bg-white mr-2"
                >
                  <Text className="text-center font-medium text-gray-600">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={addItemToInvoice}
                  className="flex-1 py-2 px-4 rounded-lg bg-green-600 ml-2"
                >
                  <Text className="text-center font-medium text-white">Add Item</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Invoice Totals */}
        {items.length > 0 && (
          <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Invoice Total</Text>
            
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Subtotal:</Text>
                <Text className="text-gray-900 font-medium">{formatCurrency(subtotal)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Tax ({taxRate}%):</Text>
                <Text className="text-gray-900 font-medium">{formatCurrency(tax)}</Text>
              </View>
              <View className="h-px bg-gray-300 my-2" />
              <View className="flex-row justify-between">
                <Text className="text-xl font-bold text-gray-900">Amount Due:</Text>
                <Text className="text-xl font-bold text-green-600">{formatCurrency(total)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="p-4 border-t border-gray-200 bg-white">
        <Pressable
          onPress={handleSave}
          className="bg-green-600 rounded-lg py-4 items-center"
        >
          <Text className="text-white font-semibold text-lg">Generate Invoice</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CreateInvoiceScreen;