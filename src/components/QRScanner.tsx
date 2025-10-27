import React, { useState } from 'react';
import { View, Text, Modal, Pressable, Alert, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (scannedData: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ visible, onClose, onScan }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (!scanned) {
      setScanned(true);
      onScan(data);
      setTimeout(() => {
        setScanned(false);
        onClose();
      }, 100);
    }
  };

  if (!visible) {
    return null;
  }

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Camera Permission</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
            <Text style={styles.permissionText}>
              Camera access is required to scan QR codes
            </Text>
            <Pressable onPress={requestPermission} style={styles.permissionButton}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Scan Part Code</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
            }}
          />

          {/* Scanning Frame Overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Scan the QR code or barcode on your part
          </Text>
          <Text style={styles.instructionsSubtext}>
            Supports QR codes, barcodes, and SKU labels
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1F2937',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 20,
  },
  permissionText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContainer: {
    padding: 20,
    backgroundColor: '#1F2937',
  },
  instructionsText: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    fontWeight: '600',
  },
  instructionsSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default QRScanner;
