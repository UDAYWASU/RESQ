import { View, Button, Alert } from 'react-native';
import { supabase } from '../../src/services/supabaseClient';
import { useRouter } from 'expo-router';

export default function Role() {
  const router = useRouter();

  const selectRole = async (role: 'patient' | 'hospital') => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await supabase.from('profiles').insert({
      id: data.user.id,
      role,
    });

    if (error) Alert.alert('Error', error.message);
    else router.replace('/');
  };

  return (
    <View style={{ padding: 20, gap: 12 }}>
      <Button title="I am a Patient" onPress={() => selectRole('patient')} />
      <Button title="I am a Hospital" onPress={() => selectRole('hospital')} />
    </View>
  );
}
