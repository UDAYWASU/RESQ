import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, Alert, 
  SafeAreaView, StyleSheet, StatusBar, Switch, ActivityIndicator,Platform,Linking
} from 'react-native';
import { supabase } from '../../src/services/supabaseClient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AlertService from './AlertService';


const COLORS = {
  primary: '#D32F2F',      // Emergency Red
  success: '#2E7D32',      // Dispatch Green
  secondary: '#1A1A1A',    // Dark Onyx
  bg: '#F5F5F7',           // Light Gray BG
  card: '#FFFFFF',
  border: '#E0E0E0',
  textMain: '#212121',
  textSecondary: '#757575',
  accent: '#FFEBEE',       // Light Red tint
};

export default function HospitalDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'ops' | 'staff' | 'profile'>('ops');
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
useEffect(() => {
    // Initialize Permissions
    AlertService.setupNotifications();

    // Start Realtime Listener for NEW Alerts
    const subscribeToEmergencies = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('new-emergency-alerts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'emergencies',
          },
          (payload) => {
            // Only trigger if it's for THIS hospital OR it's a general broadcast (null hospital_id)
            if (payload.new.status === 'sent' && (!payload.new.hospital_id || payload.new.hospital_id === user.id)) {
               AlertService.triggerAlarm(payload.new.emergency_type);
            }
          }
        )
        .subscribe();

      return channel;
    };

    const channelPromise = subscribeToEmergencies();

    return () => {
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, []);


  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('hospitals').select('*').eq('id', user.id).single();
    setHospital(data);
    setLoading(false);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Syncing with RES-Q Network...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>RES-Q COMMAND CENTER</Text>
          <Text style={styles.headerSub}>{hospital?.hospital_name}</Text>
        </View>
        <View style={styles.statusDotContainer}>
          <View style={styles.livePulse} />
          <Text style={styles.liveStatusText}>ONLINE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === 'ops' && <OperationsView hospitalId={hospital.id} />}
        {tab === 'staff' && <StaffView hospitalId={hospital.id} />}
        {tab === 'profile' && <ProfileView hospital={hospital} onUpdate={fetchInitialData} />}
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.nav}>
        <NavButton active={tab === 'ops'} label="Alerts" icon="📡" onPress={() => setTab('ops')} />
        <NavButton active={tab === 'staff'} label="Medical Team" icon="👨‍⚕️" onPress={() => setTab('staff')} />
        <NavButton active={tab === 'profile'} label="Facility" icon="🏥" onPress={() => setTab('profile')} />
      </View>
    </SafeAreaView>
  );
}

// --- SUB-VIEWS ---

function OperationsView({ hospitalId }: { hospitalId: string }) {
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadDismissed();
    loadEmergencies();
    const interval = setInterval(loadEmergencies, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDismissed = async () => {
    try {
      const saved = await AsyncStorage.getItem(`dismissed_${hospitalId}`);
      if (saved) setDismissedIds(JSON.parse(saved));
    } catch (e) {
      console.log("AsyncStorage not ready");
    }
  };

  const loadEmergencies = async () => {
    if (!hospitalId) return;
    setIsSyncing(true);

    const { data, error } = await supabase
      .from('emergencies')
      .select(`
        *,
        patient:patients (
          name,
          age,
          blood_group,
          medical_conditions,
          allergies,
          emergency_contact_phone
        )
      `)
      .eq('status', 'sent')
      .or(`status.eq.sent,hospital_id.eq.${hospitalId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch Error:", error.message);
    } else {
      setEmergencies(data || []);
    }
    setIsSyncing(false);
  };





  const ignoreEmergency = async (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    try {
      await AsyncStorage.setItem(`dismissed_${hospitalId}`, JSON.stringify(newDismissed));
    } catch (e) {
       console.log("Error saving dismissal");
    }
  };

  const acceptEmergency = async (id: string) => {
    const { error } = await supabase
      .from('emergencies')
      .update({ status: 'accepted', hospital_id: hospitalId })
      .eq('id', id);
    
    if (!error) loadEmergencies();
    else Alert.alert("Error", error.message);
  };

  const visibleEmergencies = emergencies.filter(e => !dismissedIds.includes(e.id));

  return (
    <View>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Active Alerts ({visibleEmergencies.length})</Text>
        {isSyncing && <ActivityIndicator size="small" color={COLORS.primary} />}
      </View>
      
      {visibleEmergencies.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active SOS signals in your range.</Text>
        </View>
      )}

      {visibleEmergencies.map(e => (
        <View key={e.id} style={[styles.card, e.status === 'sent' ? styles.alertBorder : styles.acceptedBorder]}>
          
          <View style={styles.rowBetween}>
            <View style={[styles.badge, { backgroundColor: e.status === 'sent' ? COLORS.primary : COLORS.success }]}>
              <Text style={styles.badgeText}>{e.emergency_type.toUpperCase()}</Text>
            </View>
            <Text style={styles.timeText}>{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>

          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{e.patient?.name || 'Scanning for Profile...'}</Text>
            <Text style={styles.patientSub}>
              Age: {e.patient?.age || '?'} • Blood: {e.patient?.blood_group || 'N/A'}
            </Text>
            
            <View style={styles.vitalsGrid}>
              <View style={styles.vitalBox}>
                <Text style={styles.vitalLabel}>CONDITIONS</Text>
                <Text style={styles.vitalValue} numberOfLines={1}>
                  {e.patient?.medical_conditions?.join(', ') || 'None reported'}
                </Text>
              </View>
              <View style={styles.vitalBox}>
                <Text style={styles.vitalLabel}>ALLERGIES</Text>
                <Text style={styles.vitalValue} numberOfLines={1}>{e.patient?.allergies || 'None'}</Text>
              </View>
            </View>
          </View>

          {e.status === 'sent' ? (
            <View style={styles.buttonRow}>
              <Pressable style={styles.ignoreBtn} onPress={() => ignoreEmergency(e.id)}>
                <Text style={styles.ignoreBtnText}>Ignore</Text>
              </Pressable>
              <Pressable style={styles.acceptBtn} onPress={() => acceptEmergency(e.id)}>
                <Text style={styles.acceptBtnText}>ACCEPT SOS</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.confirmedBox}>
              <Text style={styles.confirmedText}>✓ DISPATCH CONFIRMED - PREPARE ER</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ... StaffView and ProfileView remain as you provided ...

function StaffView({ hospitalId }: { hospitalId: string }) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', specialisation: '', experience_years: '', education: '' });

  useEffect(() => { loadStaff(); }, []);

  const loadStaff = async () => {
    const { data } = await supabase.from('doctors').select('*').eq('hospital_id', hospitalId);
    setDoctors(data || []);
  };

  const saveStaff = async () => {
    const { error } = await supabase.from('doctors').insert({
      hospital_id: hospitalId,
      ...form,
      experience_years: parseInt(form.experience_years) || 0
    });
    if (error) Alert.alert('Error', error.message);
    else {
      setShowAdd(false);
      setForm({ name: '', specialisation: '', experience_years: '', education: '' });
      loadStaff();
    }
  };

  return (
    <View>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Medical Team</Text>
        <Pressable onPress={() => setShowAdd(!showAdd)} style={styles.smallBtn}>
          <Text style={styles.smallBtnText}>{showAdd ? 'Cancel' : '+ Add Doctor'}</Text>
        </Pressable>
      </View>

      {showAdd && (
        <View style={styles.card}>
          <TextInput placeholder="Doctor Name" style={styles.input} value={form.name} onChangeText={t => setForm({...form, name: t})} />
          <TextInput placeholder="Specialisation" style={styles.input} value={form.specialisation} onChangeText={t => setForm({...form, specialisation: t})} />
          <TextInput placeholder="Experience (Years)" style={styles.input} keyboardType="numeric" value={form.experience_years} onChangeText={t => setForm({...form, experience_years: t})} />
          <TextInput placeholder="Education (e.g. MD, MBBS)" style={styles.input} value={form.education} onChangeText={t => setForm({...form, education: t})} />
          <Pressable style={styles.btnPrimary} onPress={saveStaff}><Text style={styles.btnText}>Add to Roster</Text></Pressable>
        </View>
      )}

      {doctors.map(d => (
        <View key={d.id} style={styles.card}>
          <Text style={styles.docName}>{d.name}</Text>
          <Text style={styles.docSpec}>{d.specialisation} • {d.experience_years}yr Exp</Text>
          <Text style={styles.detailsText}>{d.education}</Text>
        </View>
      ))}
    </View>
  );
}

import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get("window").width;
const AMBULANCES = ['AMB-01', 'AMB-02', 'AMB-03', 'AMB-04'];
// 1. The custom Toggle component
const Toggle = ({ label, value, field, onToggle }: any) => (
  <Pressable 
    style={styles.toggleRow} 
    onPress={() => onToggle(field, !value)}
  >
    <Text style={styles.toggleLabel}>{label}</Text>
    <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}>
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </View>
  </Pressable>
);
function ProfileView({ hospital, onUpdate }: any) {
  const [editHosp, setEditHosp] = useState({ ...hospital });
  const [activePatients, setActivePatients] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadActivePatients();
    const channel = supabase.channel('active-patients')
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'emergencies', 
          filter: `hospital_id=eq.${hospital.id}` 
      }, () => loadActivePatients())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadActivePatients = async () => {
    const { data } = await supabase
      .from('emergencies')
      .select(`*, patient:patients(*)`)
      .eq('hospital_id', hospital.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });
    setActivePatients(data || []);
  };

const updateField = async (field: string, value: any) => {
  // 1. Update UI state immediately for responsiveness
  setEditHosp((prev: any) => ({ ...prev, [field]: value }));

  // 2. Perform the background sync to Supabase
  const { error } = await supabase
    .from('hospitals')
    .update({ [field]: value })
    .eq('id', hospital.id);

  if (error) {
    // Revert the toggle if the database update fails
    setEditHosp((prev: any) => ({ ...prev, [field]: !value }));
    Alert.alert("Sync Error", "Failed to update capability. Please try again.");
    console.error("Database sync error:", error.message);
  }
};

const handleTextChange = (field: string, value: string) => {
  setEditHosp((prev: any) => ({ ...prev, [field]: value }));
};

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('hospitals')
      .update(editHosp)
      .eq('id', hospital.id);

    if (error) Alert.alert("Error", "Update failed.");
    else {
      Alert.alert("Success", "Facility details updated.");
      onUpdate(); // Refresh the parent state
    }
  };

const closeCase = async (emergencyId: string) => {
  Alert.alert(
    "Close Case",
    "Are you sure the emergency is resolved? This will release the ambulance.",
    [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Confirm", 
        onPress: async () => {
          const { error } = await supabase
            .from('emergencies')
            .update({ 
              status: 'completed', // Matches your DB check constraint
              ambulance_id: null    // Releases the ambulance
            })
            .eq('id', emergencyId);

          if (error) {
            Alert.alert("Error", "Could not close the case.");
          } else {
            // Refresh the list
            loadActivePatients();
          }
        } 
      }
    ]
  );
};

const navigateToPatient = (lat: number, lng: number, name: string) => {
  const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
  const latLng = `${lat},${lng}`;
  const label = `Patient: ${name}`;
  const url = Platform.select({
    ios: `${scheme}${label}@${latLng}`,
    android: `${scheme}${latLng}(${label})`
  });

  if (url) {
    Linking.openURL(url);
  } else {
    Alert.alert("Error", "Could not open map application");
  }
};
  const assignAmbulance = async (emergencyId: string, ambId: string) => {
    const { error } = await supabase
      .from('emergencies')
      .update({ ambulance_id: ambId })
      .eq('id', emergencyId);
    if (error) Alert.alert("Error", "Could not assign ambulance.");
    else loadActivePatients();
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      {/* --- CURRENT PATIENTS SECTION --- */}
      <Text style={styles.sectionTitle}>Active ER Dispatches</Text>
      {activePatients.length === 0 ? (
        <Text style={styles.emptyText}>No active incoming patients.</Text>
      ) : (
        activePatients.map(e => (
<View key={e.id} style={styles.card}>
    {/* --- NEW HEADER SECTION WITH NAVIGATION --- */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.patientName}>{e.patient?.name || 'Unknown'}</Text>
        <Text style={styles.detailsText}>
          Age: {e.patient?.age} | Blood: {e.patient?.blood_group}
        </Text>
      </View>
      
<Pressable 
        style={styles.closeCaseBtn} 
        onPress={() => closeCase(e.id)}
      >
        <Text style={styles.closeCaseBtnText}>CLOSE CASE</Text>
      </Pressable>
      
      {/* NAVIGATION BUTTON */}
      <Pressable 
        style={styles.navActionBtn} 
        onPress={() => navigateToPatient(e.patient_latitude, e.patient_longitude, e.patient?.name)}
      >
        <Text style={styles.navActionBtnText}>📍 LOCATE</Text>
      </Pressable>
    </View>
    {/* --- END HEADER SECTION --- */}

    <Text style={[styles.detailsText, { marginTop: 8 }]}>
      Conditions: {e.patient?.medical_conditions?.join(', ') || 'None'}
    </Text>
    
    {/* ... (Keep your existing ambulance assignment / monitor logic below) ... */}
    {!e.ambulance_id ? (
      <View style={{ marginTop: 15 }}>
        <Text style={styles.inputLabel}>Assign Ambulance (IoT Connected):</Text>
        <View style={styles.ambRow}>
          {AMBULANCES.map(amb => (
            <Pressable key={amb} style={styles.ambBtn} onPress={() => assignAmbulance(e.id, amb)}>
              <Text style={styles.ambBtnText}>{amb}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    ) : (
      <View style={styles.activeMonitorBox}>
        <Text style={styles.ambAssignedText}>🚑 {e.ambulance_id} Deployed</Text>
        <LiveVitalsMonitor emergencyId={e.id} />
      </View>
    )}
  </View>
        ))
      )}

      {/* --- FACILITY CONFIGURATION --- */}
      <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Facility Configuration</Text>
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Facility Name</Text>
        <TextInput 
          style={styles.input} 
          value={editHosp.hospital_name} 
          onChangeText={t => handleTextChange('hospital_name', t)} 
        />
        
        <Text style={styles.inputLabel}>Emergency Contact</Text>
        <TextInput 
          style={styles.input} 
          value={editHosp.emergency_contact} 
          onChangeText={t => handleTextChange('hospital_name', t)} 
        />

        <Text style={[styles.inputLabel, { marginTop: 10 }]}>Critical Capabilities</Text>
        <Toggle 
          label="Pregnancy / Maternity" 
          value={editHosp.handles_pregnancy} 
          field="handles_pregnancy" 
          onToggle={updateField} 
        />
        <Toggle 
          label="Trauma / Accident" 
          value={editHosp.handles_accident} 
          field="handles_accident" 
          onToggle={updateField} 
        />
        <Toggle 
          label="Cardiac Unit" 
          value={editHosp.handles_cardiac} 
          field="handles_cardiac" 
          onToggle={updateField} 
        />

        <Pressable style={styles.btnPrimary} onPress={handleUpdate}>
          <Text style={styles.btnText}>Save Changes</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutBtn} onPress={() => supabase.auth.signOut().then(() => router.replace('/auth/login'))}>
        <Text style={styles.logoutText}>Secure Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

import { format } from 'date-fns'; // Optional: npm install date-fns or use simple JS slice

function LiveVitalsMonitor({ emergencyId }: { emergencyId: string }) {
  const [hrData, setHrData] = useState<number[]>([0]); 
  const [spo2Data, setSpo2Data] = useState<number[]>([0]);
  const [labels, setLabels] = useState<string[]>(["--:--"]);

  useEffect(() => {
    fetchInitialVitals();

    const channel = supabase.channel(`vitals-${emergencyId}`)
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'live_vitals', filter: `emergency_id=eq.${emergencyId}` 
      }, (payload) => {
        const newVitals = payload.new;
        
        // Format current time as HH:MM:SS or just HH:MM
        const timeLabel = new Date(newVitals.recorded_at).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        setHrData(prev => [...prev.slice(-9), newVitals.heart_rate]);
        setSpo2Data(prev => [...prev.slice(-9), newVitals.spo2]);
        setLabels(prev => [...prev.slice(-9), timeLabel]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInitialVitals = async () => {
    const { data } = await supabase.from('live_vitals')
      .select('*').eq('emergency_id', emergencyId)
      .order('recorded_at', { ascending: false }).limit(10);
    
    if (data && data.length > 0) {
      const reversed = data.reverse();
      setHrData(reversed.map(d => d.heart_rate));
      setSpo2Data(reversed.map(d => d.spo2));
      setLabels(reversed.map(d => {
        return new Date(d.recorded_at).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }));
    }
  };

  const currentHR = hrData[hrData.length - 1] || 0;
  const currentSpO2 = spo2Data[spo2Data.length - 1] || 0;
  const lastUpdate = labels[labels.length -1];

  return (
    <View style={{ marginTop: 15 }}>
      {/* HEADER WITH SUMMARY & LAST UPDATED TIME */}
      <View style={styles.rowBetween}>
        <View>
            <Text style={[styles.vitalHuge, { color: '#D32F2F' }]}>❤️ {currentHR} bpm</Text>
            <Text style={[styles.vitalHuge, { color: '#2563EB' }]}>💨 {currentSpO2}% SpO2</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '700' }}>LAST SYNC</Text>
            <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '800' }}>{lastUpdate}</Text>
        </View>
      </View>

      <LineChart
        data={{
          labels: labels, // Now showing the 10-second interval timestamps
          datasets: [
            { data: hrData, color: () => '#D32F2F', strokeWidth: 2 },
            { data: spo2Data, color: () => '#2563EB', strokeWidth: 2 }
          ]
        }}
        width={screenWidth - 80}
        height={180} // Increased height slightly to accommodate labels
        chartConfig={{
          backgroundColor: '#FFF',
          backgroundGradientFrom: '#FFF',
          backgroundGradientTo: '#FFF',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`, // Muted slate for grid/labels
          labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
          propsForDots: { r: "4", strokeWidth: "2", stroke: "#FFF" },
          propsForLabels: { fontSize: 9 } // Smaller font for X-axis time
        }}
        bezier // Makes the lines smooth/curvy
        style={{ marginTop: 15, borderRadius: 15, paddingRight: 40 }}
        verticalLabelRotation={30} // Rotates time labels so they don't overlap
      />
      
      <Text style={styles.iotStatus}>
        ● Live IoT Feed (Updates every 10s)
      </Text>
    </View>
  );
}

// Additional Style

const NavButton = ({ active, label, icon, onPress }: any) => (
  <Pressable onPress={onPress} style={styles.navItem}>
    <Text style={{ fontSize: 22, opacity: active ? 1 : 0.5 }}>{icon}</Text>
    <Text style={[styles.navText, active && { color: COLORS.primary, fontWeight: '800' }]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: COLORS.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 1.5 },
  headerSub: { fontSize: 20, fontWeight: '900', color: COLORS.secondary },
  statusDotContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 6, borderRadius: 12 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 6 },
  liveStatusText: { fontSize: 10, fontWeight: '800', color: '#2E7D32' },
  scroll: { padding: 16, paddingBottom: 120 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15, color: COLORS.secondary },
  card: { backgroundColor: COLORS.card, padding: 16, borderRadius: 20, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  alertBorder: { borderLeftWidth: 6, borderLeftColor: COLORS.primary },
  acceptedBorder: { borderLeftWidth: 6, borderLeftColor: COLORS.success },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
  timeText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  patientInfo: { marginTop: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  patientName: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  patientSub: { fontSize: 13, color: '#666', marginBottom: 10 },
  vitalsGrid: { flexDirection: 'row', gap: 10 },
  vitalBox: { flex: 1, backgroundColor: '#F8F9FA', padding: 8, borderRadius: 8 },
  vitalLabel: { fontSize: 9, fontWeight: '900', color: '#999', marginBottom: 2 },
  vitalValue: { fontSize: 12, color: '#333', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  ignoreBtn: { flex: 1, backgroundColor: '#F5F5F5', padding: 14, borderRadius: 12, alignItems: 'center' },
  acceptBtn: { flex: 2, backgroundColor: '#2E7D32', padding: 14, borderRadius: 12, alignItems: 'center' },
  ignoreBtnText: { color: '#666', fontWeight: '700' },
  acceptBtnText: { color: '#FFF', fontWeight: '800' },
  confirmedBox: { marginTop: 15, padding: 12, backgroundColor: '#E8F5E9', borderRadius: 12, alignItems: 'center' },
  confirmedText: { color: COLORS.success, fontWeight: '900', fontSize: 12 },
  nav: { position: 'absolute', bottom: 0, flexDirection: 'row', width: '100%', height: 90, backgroundColor: 'white', borderTopWidth: 1, borderColor: COLORS.border, paddingBottom: 20 },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, fontWeight: '600' },
  input: { backgroundColor: COLORS.bg, padding: 14, borderRadius: 12, marginTop: 6, marginBottom: 12, fontSize: 15 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, marginLeft: 4 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: '800', fontSize: 15 },
  smallBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  smallBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
  docName: { fontSize: 17, fontWeight: '800', color: COLORS.secondary },
  docSpec: { color: COLORS.primary, fontWeight: '700', fontSize: 14, marginTop: 2 },
  detailsText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  toggleLabel: { fontSize: 15, color: COLORS.textMain, fontWeight: '600' },
  logoutBtn: { marginTop: 30, padding: 20, alignItems: 'center' },
  logoutText: { color: COLORS.primary, fontWeight: '800', letterSpacing: 1 },
  emptyCard: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center' },
  ambRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  ambBtn: { flex: 1, backgroundColor: '#E2E8F0', padding: 10, borderRadius: 8, alignItems: 'center' },
  ambBtnText: { fontWeight: '800', fontSize: 12, color: '#334155' },
  activeMonitorBox: { marginTop: 15, padding: 15, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  ambAssignedText: { fontWeight: '900', color: '#059669', marginBottom: 10 },
  vitalHuge: { fontSize: 20, fontWeight: '900' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  toggleLabel: { fontSize: 15, color: '#334155', fontWeight: '500' },
  toggleTrack: { width: 46, height: 24, borderRadius: 12, backgroundColor: '#CBD5E1', padding: 2 },
  toggleTrackActive: { backgroundColor: '#059669' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginTop: 5, marginBottom: 15 },
  btnPrimary: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#FFF', fontWeight: '800' },
  iotStatus: { fontSize: 10, color: '#059669', fontWeight: '700', marginTop: 10, textAlign: 'center' },
  smallNavBtn: {
  backgroundColor: '#F1F5F9',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
smallNavBtnText: {
  color: '#0F172A',
  fontSize: 12,
  fontWeight: '800',
},
closeCaseBtn: {
  backgroundColor: '#FEE2E2', // Light Red tint
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#FECACA',
},
closeCaseBtnText: {
  color: '#D32F2F', // Emergency Red
  fontSize: 11,
  fontWeight: '900',
},
});