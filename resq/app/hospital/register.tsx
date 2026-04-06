import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabaseClient';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  background: '#F0F4F8',
  white: '#FFFFFF',
  brand: '#0F172A', // Dark professional Slate
  primary: '#2563EB', // Electric Blue
  success: '#10B981', // Emerald
  warning: '#F59E0B',
  textHeader: '#1E293B',
  textMain: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
};

export default function HospitalRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  const [form, setForm] = useState({
    hospital_name: '',
    address: '',
    emergency_contact: '',
    handles_pregnancy: false,
    handles_accident: false,
    handles_cardiac: false,
  });

  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  const fetchGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need GPS to route emergencies to you.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not retrieve location.');
    } finally {
      setGpsLoading(false);
    }
  };

  const save = async () => {
    if (!coords) return Alert.alert('Location Required', 'Tap the GPS button to pin your facility.');
    if (!form.hospital_name || !form.emergency_contact) return Alert.alert('Missing Info', 'Facility name and contact are mandatory.');

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase.from('hospitals').upsert({
        id: userData.user.id,
        ...form,
        latitude: coords.latitude,
        longitude: coords.longitude,
        updated_at: new Date(),
      });

      if (error) throw error;
      router.replace('/hospital/dashboard');
    } catch (err: any) {
      Alert.alert('Sync Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          {/* HEADER SECTION */}
          <View style={styles.headerArea}>
            <View style={styles.badge}><Text style={styles.badgeText}>FACILITY ONBOARDING</Text></View>
            <Text style={styles.title}>Register Unit</Text>
            <Text style={styles.subtitle}>Configure your hospital's emergency response profile.</Text>
          </View>

          {/* MAIN FORM CARD */}
          <View style={styles.mainCard}>
            <Text style={styles.label}>Official Name</Text>
            <TextInput 
                placeholder="e.g. City General Hospital" 
                value={form.hospital_name} 
                onChangeText={v => update('hospital_name', v)} 
                style={styles.input} 
            />

            <Text style={styles.label}>Emergency Dispatch Number</Text>
            <TextInput 
                placeholder="+1 (555) 000-0000" 
                value={form.emergency_contact} 
                onChangeText={v => update('emergency_contact', v)} 
                keyboardType="phone-pad" 
                style={styles.input} 
            />

            <Text style={styles.label}>Physical Location</Text>
            <TextInput 
                placeholder="Full Street Address" 
                value={form.address} 
                onChangeText={v => update('address', v)} 
                style={[styles.input, { height: 80 }]} 
                multiline 
            />

            {/* GPS HUD */}
            <Pressable 
                onPress={fetchGPS} 
                style={[styles.gpsHud, coords && styles.gpsHudActive]}
            >
              <View style={styles.gpsInfo}>
                <Text style={[styles.gpsTitle, coords && { color: colors.white }]}>
                    {coords ? 'Position Locked' : 'Satellite Sync'}
                </Text>
                <Text style={[styles.gpsSub, coords && { color: 'rgba(255,255,255,0.8)' }]}>
                    {coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'Tap to capture facility coordinates'}
                </Text>
              </View>
              {gpsLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.gpsIcon}>📡</Text>}
            </Pressable>
          </View>

          {/* CAPABILITIES SECTION */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medical Capabilities</Text>
            <Text style={styles.sectionSub}>Toggle specialties available at this unit.</Text>
          </View>

          <View style={styles.capabilityGrid}>
            <CapabilityToggle 
                label="Pregnancy" 
                icon="👶" 
                active={form.handles_pregnancy} 
                onPress={() => update('handles_pregnancy', !form.handles_pregnancy)} 
            />
            <CapabilityToggle 
                label="Accidents" 
                icon="🚑" 
                active={form.handles_accident} 
                onPress={() => update('handles_accident', !form.handles_accident)} 
            />
            <CapabilityToggle 
                label="Cardiac" 
                icon="❤️" 
                active={form.handles_cardiac} 
                onPress={() => update('handles_cardiac', !form.handles_cardiac)} 
            />
          </View>

          {/* SUBMIT BUTTON */}
          <Pressable onPress={save} disabled={loading} style={styles.saveBtn}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Deploy Facility Profile</Text>}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Dynamic Sub-Component ---
function CapabilityToggle({ label, icon, active, onPress }: any) {
  return (
    <Pressable 
        onPress={onPress} 
        style={[styles.capBox, active && styles.capBoxActive]}
    >
      <Text style={styles.capIcon}>{icon}</Text>
      <Text style={[styles.capLabel, active && styles.capLabelActive]}>{label}</Text>
      <View style={[styles.dot, active && styles.dotActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingBottom: 60 },
  
  headerArea: { marginBottom: 30 },
  badge: { backgroundColor: colors.brand, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 36, fontWeight: '900', color: colors.textHeader, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: colors.textMuted, marginTop: 4, lineHeight: 22 },

  mainCard: {
    backgroundColor: colors.white,
    borderRadius: 30,
    padding: 24,
    shadowColor: colors.brand,
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 15 },
    elevation: 8,
    marginBottom: 24,
  },
  label: { fontSize: 12, fontWeight: '800', color: colors.brand, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
  input: { backgroundColor: colors.inputBg, borderRadius: 16, padding: 16, fontSize: 16, color: colors.textHeader, marginBottom: 20, borderWidth: 1, borderColor: colors.border },

  gpsHud: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  gpsHudActive: {
    backgroundColor: colors.primary,
    borderStyle: 'solid',
    borderColor: colors.primary,
  },
  gpsInfo: { flex: 1 },
  gpsTitle: { fontWeight: '700', fontSize: 16, color: colors.primary },
  gpsSub: { fontSize: 12, color: colors.textMuted },
  gpsIcon: { fontSize: 20 },

  sectionHeader: { marginBottom: 16, paddingLeft: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.textHeader },
  sectionSub: { fontSize: 14, color: colors.textMuted },

  capabilityGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  capBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
  },
  capBoxActive: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  capIcon: { fontSize: 24, marginBottom: 8 },
  capLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  capLabelActive: { color: colors.primary },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 8 },
  dotActive: { backgroundColor: colors.primary },

  saveBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: colors.brand,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  saveBtnText: { color: colors.white, fontSize: 18, fontWeight: '800' },
});