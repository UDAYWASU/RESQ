import { useEffect } from 'react';
import { supabase } from '../src/services/supabaseClient';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      if (!profile?.role) {
        router.replace('/role-select');
      } else if (profile.role === 'patient') {
        router.replace('/patient/dashboard');
      } else {
        router.replace('/hospital/dashboard');
      }
    };

    check();
  }, []);

  return null;
}
