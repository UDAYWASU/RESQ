import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Linking, Alert, StyleSheet, Platform, Animated, Easing
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../src/services/supabaseClient';
import { useRouter, useLocalSearchParams } from 'expo-router';

const COLORS = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  primary: '#D32F2F',
  secondary: '#0F172A',
  success: '#059669',
  textMain: '#1E293B',
  textMuted: '#64748B',
  accent: '#FEE2E2',
};

export default function HospitalRadar() {
  const router = useRouter();
  const { emergencyId, type } = useLocalSearchParams<{ emergencyId: string; type: string }>();

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [acceptedHospitalId, setAcceptedHospitalId] = useState<string | null>(null);
  
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!emergencyId) return;
    
    startDynamicRadar();
    initSearch();

    // Listen for database changes instead of polling (More efficient)
    const subscription = supabase
      .channel('emergency-update')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'emergencies', filter: `id=eq.${emergencyId}` }, 
        (payload) => {
          if (payload.new.status === 'accepted' && payload.new.hospital_id) {
            setAcceptedHospitalId(payload.new.hospital_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [emergencyId]);

  const startDynamicRadar = () => {
    const createAnimation = (val: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        ])
      );
    };
    Animated.parallel([
      createAnimation(ring1, 0),
      createAnimation(ring2, 1000),
      createAnimation(ring3, 2000),
    ]).start();
  };

  const initSearch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');
      const loc = await Location.getCurrentPositionAsync({});
      
      const column = `handles_${type?.toLowerCase()}`;
      const { data, error } = await supabase.from('hospitals').select('*').eq(column, true);
      if (error) throw error;

      const nearby = (data || [])
        .map(h => ({
          ...h,
          distance: calculateDistance(loc.coords.latitude, loc.coords.longitude, h.latitude, h.longitude)
        }))
        .filter(h => h.distance <= 25)
        .sort((a, b) => a.distance - b.distance); // Lowest distance first

      setHospitals(nearby);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Search Error", "Could not locate nearby hospitals.");
    } finally {
      setInitializing(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const openNavigation = (h: any) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${h.latitude},${h.longitude}`;
    const label = h.hospital_name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) Linking.openURL(url);
  };

  const PulseRing = ({ anim }: { anim: Animated.Value }) => (
    <Animated.View style={[styles.pulse, {
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 4.5] }) }],
      opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.4, 0] })
    }]} />
  );

  return (
    <View style={styles.container}>
      <View style={[styles.radarArea, acceptedHospitalId && { backgroundColor: COLORS.success }]}>
        {!acceptedHospitalId && (
          <>
            <PulseRing anim={ring1} />
            <PulseRing anim={ring2} />
            <PulseRing anim={ring3} />
          </>
        )}
        <View style={styles.radarCenter}>
          <Text style={{ fontSize: 32 }}>{acceptedHospitalId ? '✅' : '📡'}</Text>
        </View>
        <Text style={styles.radarTitle}>
          {acceptedHospitalId ? 'HELP IS COMING' : 'SEARCHING FOR HELP'}
        </Text>
        <Text style={styles.radarSub}>
          {initializing ? 'Locating nearest centers...' : `Broadcasted SOS to ${hospitals.length} hospitals`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.listHeader}>Specialized Centers (Closest First)</Text>
        
        {initializing ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          hospitals.map(h => {
            const isAccepted = h.id === acceptedHospitalId;
            const someoneElseAccepted = acceptedHospitalId && !isAccepted;

            return (
              <View 
                key={h.id} 
                style={[
                  styles.hCard, 
                  isAccepted && styles.acceptedCard,
                  someoneElseAccepted && styles.fadedCard
                ]}
              >
                <View style={styles.hRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hName, isAccepted && { color: '#FFF' }]}>{h.hospital_name}</Text>
                    <Text style={[styles.hDist, isAccepted && { color: 'rgba(255,255,255,0.8)' }]}>
                      {h.distance.toFixed(1)} km away • {h.emergency_contact}
                    </Text>
                  </View>

                  <Pressable 
                    style={[styles.navBtnSmall, isAccepted && { backgroundColor: '#FFF' }]} 
                    onPress={() => openNavigation(h)}
                  >
                    <Text style={[styles.navBtnTextSmall, isAccepted && { color: COLORS.success }]}>
                      {isAccepted ? "EN ROUTE" : "NAVIGATE"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {!initializing && hospitals.length === 0 && (
          <Text style={styles.emptyText}>No hospitals found within 25km for this emergency type.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  radarArea: { height: 300, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  pulse: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: COLORS.primary },
  radarCenter: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', zIndex: 10, elevation: 10 },
  radarTitle: { color: '#FFF', fontWeight: '900', fontSize: 20, marginTop: 25, letterSpacing: 1 },
  radarSub: { color: 'rgba(255,255,255,0.6)', marginTop: 5, fontSize: 13 },
  scroll: { padding: 20 },
  listHeader: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, marginBottom: 15, letterSpacing: 1, textTransform: 'uppercase' },
  hCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 18, marginBottom: 12, elevation: 2 },
  acceptedCard: { backgroundColor: COLORS.success, transform: [{ scale: 1.02 }] },
  fadedCard: { opacity: 0.5, backgroundColor: '#F1F5F9' },
  hRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hName: { fontSize: 15, fontWeight: '800', color: COLORS.secondary },
  hDist: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  navBtnSmall: { backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  navBtnTextSmall: { color: '#FFF', fontWeight: '900', fontSize: 11 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40, fontStyle: 'italic' }
});