import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, Alert, StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: { type: string; id: string; name: string; price: number }) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ visible, onClose, onScan }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('back');

  useEffect(() => {
    const requestPermission = async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');

      if (permission === 'denied') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to scan QR codes.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    };

    if (visible) {
      requestPermission();
    }
  }, [visible, onClose]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        try {
          const data = JSON.parse(codes[0].value);

          if (data.type === 'part' && data.id && data.name && data.price !== undefined) {
            onScan(data);
            onClose();
          } else {
            Alert.alert('Invalid QR Code', 'This QR code is not a valid part code.');
          }
        } catch (error) {
          Alert.alert('Invalid QR Code', 'Unable to read this QR code.');
        }
      }
    },
  });

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Scan Part QR Code</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Camera View */}
        {device && hasPermission ? (
          <View style={styles.cameraContainer}>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible}
              codeScanner={codeScanner}
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
        ) : (
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
            <Text style={styles.permissionText}>
              {!hasPermission ? 'Camera permission required' : 'No camera available'}
            </Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Position the QR code within the frame to scan
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
  },
  permissionText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  instructionsContainer: {
    padding: 20,
    backgroundColor: '#1F2937',
  },
  instructionsText: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
  },
});

export default QRScanner;
