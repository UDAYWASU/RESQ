import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  Alert, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  StatusBar 
} from 'react-native';
import { supabase } from '../../src/services/supabaseClient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  background: '#F8FAFC', // Modern slate background
  white: '#FFFFFF',
  primary: '#E11D48',   // Matching your new Rose/Red theme
  primaryDark: '#9F1239',
  textHeader: '#0F172A',
  textMain: '#334155',
  textMuted: '#64748B',
  border: '#E2E8F0',
  inputBg: '#F1F5F9',
};

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const login = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Login failed', error.message);
      else if (data.session) router.replace('/');
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          
          {/* LOGO SECTION */}
          <View style={styles.headerSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🚑</Text>
            </View>
            <Text style={styles.brandName}>RES-Q</Text>
            <Text style={styles.tagline}>Emergency medical assistance at your fingertips</Text>
          </View>

          {/* FORM SECTION */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                style={[
                  styles.input,
                  focusedInput === 'email' && styles.inputFocused
                ]}
              />
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <Pressable>
                  <Text style={styles.forgotText}>Forgot?</Text>
                </Pressable>
              </View>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                style={[
                  styles.input,
                  focusedInput === 'password' && styles.inputFocused
                ]}
              />
            </View>

            <Pressable
              onPress={login}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginBtn,
                loading && styles.loginBtnDisabled,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
              ]}
            >
              <Text style={styles.loginBtnText}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </Text>
            </Pressable>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable onPress={() => router.push('/auth/signup')}>
              <Text style={styles.signUpLink}>Create Account</Text>
            </Pressable>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  
  headerSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  logoEmoji: { fontSize: 40 },
  brandName: { fontSize: 32, fontWeight: '900', color: colors.textHeader, letterSpacing: -1 },
  tagline: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },

  formCard: {
    backgroundColor: colors.white,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: colors.textHeader, marginBottom: 24, textAlign: 'center' },
  
  inputWrapper: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMain, marginLeft: 4 },
  forgotText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textHeader,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },

  loginBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  loginBtnDisabled: { backgroundColor: colors.textMuted, shadowOpacity: 0 },
  loginBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  footerText: { color: colors.textMuted, fontSize: 15 },
  signUpLink: { color: colors.primary, fontWeight: '700', fontSize: 15, marginLeft: 6 },
});