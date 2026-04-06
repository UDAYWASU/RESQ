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
import { supabase } from '../../src/services/supabaseClient';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  background: '#F8FAFC',
  white: '#FFFFFF',
  primary: '#E11D48',
  primaryLight: '#FFF1F2',
  textHeader: '#0F172A',
  textMain: '#334155',
  textMuted: '#64748B',
  border: '#E2E8F0',
  inputBg: '#F1F5F9',
};

// ---------- Reusable Components ----------
const FormSection = ({ title, children }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

const BloodGroupPicker = ({ value, onChange }: any) => {
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>Blood Group</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {bloodGroups.map((bg) => (
          <Pressable
            key={bg}
            onPress={() => onChange(bg)}
            style={[
              styles.choiceChip,
              value === bg && styles.choiceChipSelected
            ]}
          >
            <Text style={[styles.choiceText, value === bg && styles.choiceTextSelected]}>{bg}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const DynamicInputList = ({ label, value, presetOptions = [], onChange }: any) => {
  const safeValue = Array.isArray(value) ? value : [];
  
  return (
    <View style={{ marginBottom: 20 }}>
      {/* FIXED: Changed div to View below */}
      <View style={styles.listHeader}>
        <Text style={styles.label}>{label}</Text>
        <Pressable onPress={() => onChange([...safeValue, ''])} style={styles.addSmallBtn}>
          <Text style={styles.addSmallText}>+ Add New</Text>
        </Pressable>
      </View>

      {safeValue.map((val: string, idx: number) => (
        <View key={idx} style={styles.dynamicRow}>
          <TextInput
            value={val}
            placeholder="Type here..."
            onChangeText={(text) => {
              const newArr = [...safeValue];
              newArr[idx] = text;
              onChange(newArr);
            }}
            style={styles.flexInput}
          />
          <Pressable onPress={() => onChange(safeValue.filter((_, i) => i !== idx))} style={styles.removeBtn}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>✕</Text>
          </Pressable>
        </View>
      ))}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 8, gap: 8 }}>
        {presetOptions.map((opt: string) => {
          const isSelected = safeValue.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => isSelected ? onChange(safeValue.filter(v => v !== opt)) : onChange([...safeValue, opt])}
              style={[styles.presetChip, isSelected && styles.presetChipSelected]}
            >
              <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>{opt}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ---------- Main Component ----------
export default function PatientRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    blood_group: '',
    address: '',
    govt_id: '',
    medical_conditions: [] as string[],
    allergies: [] as string[],
    medications: [] as string[],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: '',
    insurance_policy: '',
  });

  const update = (key: string, value: any) => setForm({ ...form, [key]: value });

  // FETCH DATA ON LOAD
  const loadPatientData = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', userData.user.id)
        .single();

      if (data) {
        setForm({
          name: data.name || '',
          age: data.age?.toString() || '',
          gender: data.gender || '',
          blood_group: data.blood_group || '',
          address: data.address || '',
          govt_id: data.govt_id || '',
          medical_conditions: Array.isArray(data.medical_conditions) ? data.medical_conditions : [],
          allergies: Array.isArray(data.allergies) ? data.allergies : [],
          medications: Array.isArray(data.medications) ? data.medications : [],
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          insurance_provider: data.insurance_provider || '',
          insurance_policy: data.insurance_policy || '',
        });
      }
    } catch (err) {
      console.error("Error fetching patient:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, []);

  // SAVE DATA
  const save = async () => {
    try {
      setSaving(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const { error } = await supabase.from('patients').upsert({
        id: userData.user.id,
        name: form.name,
        age: form.age ? Number(form.age) : null,
        gender: form.gender,
        blood_group: form.blood_group,
        address: form.address,
        govt_id: form.govt_id,
        medical_conditions: form.medical_conditions,
        allergies: form.allergies,
        medications: form.medications,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        insurance_provider: form.insurance_provider || null,
        insurance_policy: form.insurance_policy || null,
        updated_at: new Date(),
      });

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      router.replace('/patient/dashboard');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Check your internet connection.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textMuted }}>Loading health profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerArea}>
            <Text style={styles.title}>Health Profile</Text>
            <Text style={styles.subtitle}>Keep this information up to date for emergencies.</Text>
          </View>

          <FormSection title="Personal Details">
            <Text style={styles.label}>Full Name</Text>
            <TextInput placeholder="e.g. John Doe" value={form.name} onChangeText={v => update('name', v)} style={styles.input} />
            
            <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Age</Text>
                    <TextInput placeholder="00" value={form.age} onChangeText={v => update('age', v)} keyboardType="number-pad" style={styles.input} />
                </View>
                <View style={{ flex: 2 }}>
                    <Text style={styles.label}>Govt ID</Text>
                    <TextInput placeholder="Aadhar Number" value={form.govt_id} onChangeText={v => update('govt_id', v)} keyboardType="number-pad" style={styles.input} />
                </View>
            </View>

            <BloodGroupPicker value={form.blood_group} onChange={(v: string) => update('blood_group', v)} />
            
            <Text style={styles.label}>Address</Text>
            <TextInput placeholder="Home address" value={form.address} onChangeText={v => update('address', v)} style={[styles.input, { height: 80 }]} multiline />
          </FormSection>

          <FormSection title="Medical History">
            <DynamicInputList label="Conditions" value={form.medical_conditions} onChange={(v:any) => update('medical_conditions', v)} presetOptions={['Diabetes', 'Asthma', 'Heart Issue', 'Hypertension']} />
            <DynamicInputList label="Allergies" value={form.allergies} onChange={(v:any) => update('allergies', v)} presetOptions={['Pollen', 'Peanuts', 'Latex', 'Dust']} />
            <DynamicInputList label="Current Medications" value={form.medications} onChange={(v:any) => update('medications', v)} presetOptions={['Insulin', 'Aspirin']} />
          </FormSection>

          <FormSection title="Emergency Contact">
            <Text style={styles.label}>Contact Name</Text>
            <TextInput placeholder="Relative or Friend" value={form.emergency_contact_name} onChangeText={v => update('emergency_contact_name', v)} style={styles.input} />
            <Text style={styles.label}>Phone Number</Text>
            <TextInput placeholder="+91 00000 00000" value={form.emergency_contact_phone} onChangeText={v => update('emergency_contact_phone', v)} keyboardType="phone-pad" style={styles.input} />
          </FormSection>

          <Pressable onPress={save} disabled={saving} style={[styles.mainButton, saving && { opacity: 0.7 }]}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainButtonText}>Update Health Profile</Text>}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingBottom: 40 },
  headerArea: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800', color: colors.textHeader },
  subtitle: { fontSize: 16, color: colors.textMuted, marginTop: 4 },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeader, marginBottom: 12, marginLeft: 4 },
  sectionCard: { backgroundColor: colors.white, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.textMain, marginBottom: 16 },
  
  choiceChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
  choiceChipSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  choiceText: { color: colors.textMain, fontWeight: '600' },
  choiceTextSelected: { color: colors.primary },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addSmallBtn: { padding: 4 },
  addSmallText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  dynamicRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  flexInput: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 10, padding: 10, fontSize: 15 },
  removeBtn: { width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 10 },

  presetChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  presetChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { fontSize: 12, color: colors.textMuted },
  presetTextSelected: { color: colors.white, fontWeight: '600' },

  mainButton: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  mainButtonText: { color: colors.white, fontSize: 18, fontWeight: '700' },
});