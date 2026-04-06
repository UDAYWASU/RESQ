import { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { supabase } from './src/services/supabaseClient';

export default function App() {

  const signUpTest = async () => {
    const { data, error } = await supabase.auth.signUp({
      email: 'testpatient@resq.com',
      password: 'password123'
    });

    console.log('SIGN UP:', data, error);
  };

  const signInTest = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'testpatient@resq.com',
      password: 'password123'
    });

    console.log('SIGN IN:', data, error);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>RES-Q Supabase Test</Text>
      <Button title="Sign Up" onPress={signUpTest} />
      <Button title="Sign In" onPress={signInTest} />
    </View>
  );
}
