import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Alert, 
  ActivityIndicator, StyleSheet, Dimensions
} from 'react-native';
import { supabase } from '../../src/services/supabaseClient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const EMERGENCY_CONFIG = [
  { id: 'pregnancy', label: 'PREGNANCY', icon: '🤰', color: '#EC4899' },
  { id: 'accident', label: 'ACCIDENT', icon: '🚗', color: '#F59E0B' },
  { id: 'cardiac', label: 'CARDIAC', icon: '🫀', color: '#D32F2F' },
];

export default function PatientEmergency() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'searching' | 'ready' | 'error'>('searching');

  useEffect(() => {
    autoFetchLocation();
  }, []);

  const autoFetchLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocStatus('error');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setLocStatus('ready');
    } catch (e) {
      setLocStatus('error');
    }
  };

  const reportEmergency = async () => {
    if (!selectedType) return Alert.alert('Action Required', 'Please select the type of emergency.');
    if (!location) return Alert.alert('Location Missing', 'We need your GPS to find the nearest hospital.');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create the record
    const { data, error } = await supabase.from('emergencies').insert({
      patient_id: user.id,
      emergency_type: selectedType,
      patient_latitude: location.lat,
      patient_longitude: location.lng,
      status: 'sent',
    }).select().single();

    if (error) {
      Alert.alert('System Error', error.message);
    } else {
      // Go to hospital selection immediately
      router.replace(`/patient/hospitalselect?emergencyId=${data.id}&type=${selectedType}&lat=${location.lat}&lng=${location.lng}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency SOS</Text>
        <Text style={styles.headerSub}>Select a category to notify nearby hospitals</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {EMERGENCY_CONFIG.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedType(item.id)}
              style={[
                styles.typeCard,
                selectedType === item.id && { borderColor: item.color, backgroundColor: item.color + '10', borderWidth: 3 }
              ]}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={[styles.typeLabel, selectedType === item.id && { color: item.color }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.locationBanner}>
          <View style={styles.locIndicator}>
            <View style={[styles.dot, { backgroundColor: locStatus === 'ready' ? '#10B981' : '#F59E0B' }]} />
            <Text style={styles.locText}>
              {locStatus === 'searching' ? 'Pinpointing your location...' : 
               locStatus === 'ready' ? 'GPS Location Locked' : 'Location Error'}
            </Text>
          </View>
          {locStatus === 'error' && (
            <Pressable onPress={autoFetchLocation}><Text style={styles.retryText}>Retry</Text></Pressable>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.sosButton, !selectedType && styles.disabledBtn]} 
          onPress={reportEmergency}
          disabled={!selectedType}
        >
          <Text style={styles.sosText}>SEND DISPATCH SIGNAL</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { padding: 25, paddingTop: 60, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  headerSub: { fontSize: 16, color: '#666', marginTop: 5 },
  scroll: { padding: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  typeCard: {
    width: (width - 60) / 2,
    height: 160,
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  icon: { fontSize: 40, marginBottom: 10 },
  typeLabel: { fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  locationBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA', 
    padding: 15, 
    borderRadius: 16,
    marginTop: 10 
  },
  locIndicator: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  locText: { fontSize: 13, color: '#444', fontWeight: '600' },
  retryText: { color: '#D32F2F', fontWeight: '700', fontSize: 13 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  sosButton: { 
    backgroundColor: '#D32F2F', 
    padding: 20, 
    borderRadius: 20, 
    alignItems: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8
  },
  disabledBtn: { backgroundColor: '#E5E7EB', shadowOpacity: 0 },
  sosText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
});