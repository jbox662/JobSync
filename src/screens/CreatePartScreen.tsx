import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useJobStore } from '../state/store';
import QRScanner from '../components/QRScanner';

const CreatePartScreen = () => {
  const navigation = useNavigation();
  const { addPart } = useJobStore();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [sku, setSku] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleQRScan = (scannedCode: string) => {
    try {
      // Try to parse as JSON first (in case it's structured data)
      const parsedData = JSON.parse(scannedCode);

      // Fill in all available fields from the parsed data
      if (parsedData.sku) setSku(parsedData.sku);
      if (parsedData.name) setName(parsedData.name);
      if (parsedData.price) setUnitPrice(parsedData.price.toString());
      if (parsedData.unitPrice) setUnitPrice(parsedData.unitPrice.toString());
      if (parsedData.brand) setBrand(parsedData.brand);
      if (parsedData.category) setCategory(parsedData.category);
      if (parsedData.description) setDescription(parsedData.description);
      if (parsedData.stock !== undefined) setStock(parsedData.stock.toString());
      if (parsedData.lowStockThreshold !== undefined) setLowStockThreshold(parsedData.lowStockThreshold.toString());

      Alert.alert('Success', 'Part details have been filled from the QR code');
    } catch (error) {
      // Not JSON - try to parse as text with labels
      let partName = '';
      let partNumber = '';

      // Look for "Part Name:" or "Name:" pattern
      const nameMatch = scannedCode.match(/(?:Part Name|Name)\s*:\s*([^\n\r]+?)(?=\s*(?:Part Number|Number|SKU|$))/i);
      if (nameMatch && nameMatch[1]) {
        partName = nameMatch[1].trim();
      }

      // Look for "Part Number:" or "Number:" or "SKU:" pattern
      const numberMatch = scannedCode.match(/(?:Part Number|Number|SKU)\s*:\s*([^\n\r]+?)(?=\s*(?:Part Name|Name|Price|Brand|Category|Description|$))/i);
      if (numberMatch && numberMatch[1]) {
        partNumber = numberMatch[1].trim();
      }

      // Look for "Price:" pattern
      const priceMatch = scannedCode.match(/(?:Price|Unit Price)\s*:\s*([0-9.]+)/i);
      let price = '';
      if (priceMatch && priceMatch[1]) {
        price = priceMatch[1].trim();
      }

      // Look for "Brand:" pattern
      const brandMatch = scannedCode.match(/Brand\s*:\s*([^\n\r]+?)(?=\s*(?:Price|Category|Description|$))/i);
      let brandValue = '';
      if (brandMatch && brandMatch[1]) {
        brandValue = brandMatch[1].trim();
      }

      // Look for "Category:" pattern
      const categoryMatch = scannedCode.match(/Category\s*:\s*([^\n\r]+?)(?=\s*(?:Price|Brand|Description|$))/i);
      let categoryValue = '';
      if (categoryMatch && categoryMatch[1]) {
        categoryValue = categoryMatch[1].trim();
      }

      // Apply the extracted values
      if (partName) setName(partName);
      if (partNumber) setSku(partNumber);
      if (price) setUnitPrice(price);
      if (brandValue) setBrand(brandValue);
      if (categoryValue) setCategory(categoryValue);

      // If we found structured data, show success
      if (partName || partNumber) {
        Alert.alert('Success', `Filled in: ${partName ? 'Name' : ''}${partName && partNumber ? ', ' : ''}${partNumber ? 'SKU' : ''}`);
      } else {
        // If no patterns matched, treat the whole thing as SKU
        setSku(scannedCode);
        Alert.alert('Success', `SKU "${scannedCode}" has been added`);
      }
    }
  };

  const handleSave = () => {
    if (!name.trim() || !unitPrice.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const price = parseFloat(unitPrice);
    const stockValue = parseInt(stock) || 0;
    const lowStockValue = lowStockThreshold.trim() ? parseInt(lowStockThreshold) : undefined;

    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid unit price');
      return;
    }

    if (stockValue < 0) {
      Alert.alert('Error', 'Stock cannot be negative');
      return;
    }

    if (lowStockValue !== undefined && (isNaN(lowStockValue) || lowStockValue < 0)) {
      Alert.alert('Error', 'Please enter a valid low stock threshold');
      return;
    }

    addPart({
      name: name.trim(),
      description: description.trim() || undefined,
      unitPrice: price,
      stock: stockValue,
      lowStockThreshold: lowStockValue,
      sku: sku.trim() || undefined,
      brand: brand.trim() || undefined,
      category: category.trim() || undefined,
    });

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Part Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter part name"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gray-700 font-medium">SKU / Part Number</Text>
            <Pressable
              onPress={() => setShowQRScanner(true)}
              className="bg-purple-600 px-3 py-1.5 rounded-lg flex-row items-center"
            >
              <Ionicons name="qr-code-outline" size={16} color="white" />
              <Text className="text-white text-sm font-medium ml-1">Scan</Text>
            </Pressable>
          </View>
          <TextInput
            value={sku}
            onChangeText={setSku}
            placeholder="Enter SKU or scan QR code"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Brand</Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="Enter brand name"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Unit Price *</Text>
          <TextInput
            value={unitPrice}
            onChangeText={setUnitPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Initial Stock Quantity</Text>
          <TextInput
            value={stock}
            onChangeText={setStock}
            placeholder="0"
            keyboardType="number-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Low Stock Alert Threshold</Text>
          <TextInput
            value={lowStockThreshold}
            onChangeText={setLowStockThreshold}
            placeholder="Leave empty for no alerts"
            keyboardType="number-pad"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
          <Text className="text-gray-500 text-xs mt-1">
            You'll be notified when stock falls below this number
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Enter category"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-2">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Enter part description"
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View className="p-4 border-t border-gray-200">
        <Pressable
          onPress={handleSave}
          className="bg-blue-600 rounded-lg py-4 items-center"
        >
          <Text className="text-white font-semibold text-lg">Add Part</Text>
        </Pressable>
      </View>

      {/* QR Scanner Modal */}
      <QRScanner
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </KeyboardAvoidingView>
  );
};

export default CreatePartScreen;