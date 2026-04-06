import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { supabase } from '../../src/services/supabaseClient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  background: '#F8FAFC', // Consistent with Login
  white: '#FFFFFF',
  primary: '#E11D48',
  textHeader: '#0F172A',
  textMain: '#334155',
  textMuted: '#64748B',
  border: '#E2E8F0',
  inputBg: '#F1F5F9',
};

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length > 5) score += 1; // Length check
    if (/[A-Z]/.test(pass)) score += 1; // Uppercase
    if (/[0-9]/.test(pass)) score += 1; // Numbers
    if (/[^A-Za-z0-9]/.test(pass)) score += 1; // Special Chars
    return score; // Max 4
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', '#E11D48', '#FB923C', '#FACC15', '#22C55E'];

  const validateInputs = () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const signup = async () => {
    if (!validateInputs()) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Signup Failed', error.message);
        return;
      }

      Alert.alert('Account Created', 'Please check your email to verify your account.');
      router.replace('/auth/login');
    } catch (err: any) {
      Alert.alert('Unexpected Error', err.message || 'Something went wrong.');
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
          
          {/* HEADER SECTION */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Join RES-Q</Text>
            <Text style={styles.subtitle}>
              Protect yourself and your family with instant emergency coordination.
            </Text>
          </View>

          {/* FORM CARD */}
          <View style={styles.formCard}>
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
                  focusedInput === 'email' && styles.inputFocused,
                ]}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                style={[
                  styles.input,
                  focusedInput === 'password' && styles.inputFocused,
                ]}
              />

              {/* PASSWORD STRENGTH VISUAL */}
          {password.length > 0 && (
            <View style={styles.strengthWrapper}>
              <View style={styles.strengthBarBackground}>
                <View 
                  style={[
                    styles.strengthBarFill, 
                    { 
                      width: `${(strength / 4) * 100}%`, 
                      backgroundColor: strengthColors[strength] 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>
                {strengthLabels[strength]}
              </Text>
            </View>
          )}
            </View>

            <Pressable
              onPress={signup}
              disabled={loading}
              style={({ pressed }) => [
                styles.signupBtn,
                loading && styles.signupBtnDisabled,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.signupBtnText}>Create Account</Text>
              )}
            </Pressable>
            
            <Text style={styles.termsText}>
              By signing up, you agree to our <Text style={styles.linkText}>Terms of Service</Text>.
            </Text>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
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
  
  headerSection: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: colors.textHeader, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: colors.textMuted, marginTop: 8, lineHeight: 22 },

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
  
  inputWrapper: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMain, marginBottom: 8, marginLeft: 4 },
  
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

  signupBtn: {
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
  signupBtnDisabled: { backgroundColor: colors.textMuted, shadowOpacity: 0 },
  signupBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  termsText: { 
    fontSize: 12, 
    color: colors.textMuted, 
    textAlign: 'center', 
    marginTop: 20, 
    lineHeight: 18 
  },
  linkText: { color: colors.textMain, fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  footerText: { color: colors.textMuted, fontSize: 15 },
  loginLink: { color: colors.primary, fontWeight: '700', fontSize: 15, marginLeft: 6 },
});