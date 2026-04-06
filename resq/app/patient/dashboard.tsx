import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { supabase } from '../../src/services/supabaseClient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
//import { LinearGradient } from 'expo-linear-gradient'; // Optional: for a premium feel

const colors = {
  background: '#F8FAFC',
  white: '#FFFFFF',
  primary: '#E11D48', // More modern Rose/Red
  primaryDark: '#9F1239',
  secondary: '#64748B',
  textHeader: '#0F172A',
  textMain: '#334155',
  accent: '#F1F5F9',
  border: '#E2E8F0',
  shadow: '#000',
};

export default function PatientDashboard() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadPatient = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    if (!error) setPatient(data);
    setLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  useEffect(() => { loadPatient(); }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, 👋</Text>
          <Text style={styles.userName}>{patient?.name || 'Patient'}</Text>
        </View>
        <Pressable onPress={() => router.push('/patient/register')} style={styles.editBadge}>
          <Text style={styles.editBadgeText}>Edit Profile</Text>
        </Pressable>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* EMERGENCY ACTION CARD */}
        <Pressable 
          onPress={() => router.push('/patient/emergency')}
          style={({ pressed }) => [styles.emergencyCard, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.emergencyIconBg}>
            <Text style={{ fontSize: 24 }}>🚨</Text>
          </View>
          <View>
            <Text style={styles.emergencyTitle}>Emergency Help</Text>
            <Text style={styles.emergencySub}>Instant medical assistance</Text>
          </View>
        </Pressable>

        {/* QUICK STATS ROW */}
        <View style={styles.statsRow}>
            <StatBox label="Blood" value={patient?.blood_group || 'N/A'} color="#FEE2E2" textColor="#991B1B" />
            <StatBox label="Age" value={`${patient?.age} yrs`} color="#E0F2FE" textColor="#075985" />
            <StatBox label="Gender" value={patient?.gender} color="#F0FDF4" textColor="#166534" />
        </View>

        {/* DATA SECTIONS */}
        <DashboardSection title="Medical Records">
  <ListInfoItem 
    label="Conditions" 
    data={patient?.medical_conditions} 
    icon="🏥" 
  />
  <ListInfoItem 
    label="Allergies" 
    data={patient?.allergies} 
    icon="⚠️" 
  />
  <ListInfoItem 
    label="Current Meds" 
    data={patient?.medications} 
    icon="💊" 
  />
</DashboardSection>

        <DashboardSection title="Emergency & Insurance">
          <InfoItem label="Primary Contact" value={patient?.emergency_contact_name} subValue={patient?.emergency_contact_phone} icon="📞" />
          <InfoItem label="Insurance" value={patient?.insurance_provider} subValue={patient?.insurance_policy} icon="🛡️" />
        </DashboardSection>

        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Sub-Components ---------- */

function ListInfoItem({ label, data, icon }: { label: string, data: any, icon: string }) {
  
  const sanitizeData = (input: any): string[] => {
    if (!input) return [];
    
    // If it's already a clean Array (Supabase sometimes does this)
    if (Array.isArray(input)) return input;

    // If it's a string that looks like a JSON array: ["Item"]
    if (typeof input === 'string' && input.startsWith('[')) {
      try {
        return JSON.parse(input);
      } catch (e) {
        // Fallback if JSON.parse fails
        return input.replace(/[\[\]"]/g, '').split(',').map(s => s.trim());
      }
    }

    // If it's just a comma-separated string
    if (typeof input === 'string') {
      return input.split(',').map(s => s.trim()).filter(s => s !== "");
    }

    return [];
  };

  const items = sanitizeData(data);
  const hasData = items.length > 0;

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}><Text>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <View style={styles.chipContainer}>
          {hasData ? (
            items.map((item: string, index: number) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{item}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>None reported</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function StatBox({ label, value, color, textColor }: any) {
    return (
        <View style={[styles.statBox, { backgroundColor: color }]}>
            <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: textColor, opacity: 0.7 }]}>{label}</Text>
        </View>
    );
}

function DashboardSection({ title, children }: any) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function InfoItem({ label, value, subValue, icon }: any) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}><Text>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
        {subValue && <Text style={styles.infoSubValue}>{subValue}</Text>}
      </View>
    </View>
  );
}

/* ---------- Professional Styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  greeting: { fontSize: 16, color: colors.secondary, fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', color: colors.textHeader },
  editBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editBadgeText: { fontSize: 12, fontWeight: '600', color: colors.secondary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  emergencyCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  emergencyIconBg: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emergencyTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  emergencySub: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { flex: 1, marginHorizontal: 4, padding: 15, borderRadius: 20, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  sectionContainer: { marginBottom: 24 },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: colors.textHeader, marginBottom: 12, marginLeft: 4 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel: { fontSize: 12, color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  infoValue: { fontSize: 16, color: colors.textMain, fontWeight: '500', marginTop: 1 },
  infoSubValue: { fontSize: 14, color: colors.secondary, marginTop: 2 },
  
  logoutBtn: { marginTop: 10, padding: 16, alignItems: 'center' },
  logoutText: { color: colors.secondary, fontWeight: '600', fontSize: 15 },

  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: '#F1F5F9', // Light Slate
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 4,
  }
});