import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { supabase } from '../src/services/supabaseClient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

export default function RoleSelect() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<'patient' | 'hospital' | null>(null);

  const selectRole = async (role: 'patient' | 'hospital') => {
    setLoadingRole(role);
    const { data } = await supabase.auth.getUser();
    
    if (!data.user) {
      setLoadingRole(null);
      return;
    }

    const { error } = await supabase.from('profiles').insert({
      id: data.user.id,
      role,
    });

    if (error) {
      alert(error.message);
      setLoadingRole(null);
      return;
    }

    router.replace(`/${role}/register`);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        
        {/* HEADER SECTION */}
        <View style={styles.headerArea}>
          <Text style={styles.title}>Welcome to RES-Q</Text>
          <Text style={styles.subtitle}>
            How would you like to use the platform today?
          </Text>
        </View>

        {/* ROLE OPTIONS */}
        <View style={styles.optionsContainer}>
          
          <Pressable
            onPress={() => selectRole('patient')}
            disabled={!!loadingRole}
            style={({ pressed }) => [
              styles.roleCard,
              loadingRole === 'patient' && styles.activeCard,
              pressed && { transform: [{ scale: 0.98 }] }
            ]}
          >
            <View style={[styles.iconCircle, loadingRole === 'patient' && styles.activeIconCircle]}>
              <Text style={styles.roleEmoji}>👤</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.roleText}>I am a Patient</Text>
              <Text style={styles.roleSubtext}>
                I need emergency assistance or want to manage my health profile.
              </Text>
            </View>
            {loadingRole === 'patient' && <View style={styles.indicator} />}
          </Pressable>

          <Pressable
            onPress={() => selectRole('hospital')}
            disabled={!!loadingRole}
            style={({ pressed }) => [
              styles.roleCard,
              loadingRole === 'hospital' && styles.activeCard,
              pressed && { transform: [{ scale: 0.98 }] }
            ]}
          >
            <View style={[styles.iconCircle, loadingRole === 'hospital' && styles.activeIconCircle]}>
              <Text style={styles.roleEmoji}>🏥</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.roleText}>I am a Hospital</Text>
              <Text style={styles.roleSubtext}>
                We are a medical facility responding to incoming emergency requests.
              </Text>
            </View>
            {loadingRole === 'hospital' && <View style={styles.indicator} />}
          </Pressable>

        </View>

        {/* FOOTER NOTE */}
        <Text style={styles.footerNote}>
       
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerArea: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textHeader,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    position: 'relative',
  },
  activeCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activeIconCircle: {
    backgroundColor: colors.white,
  },
  roleEmoji: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
  },
  roleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textHeader,
  },
  roleSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  indicator: {
    position: 'absolute',
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  footerNote: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 40,
  },
});