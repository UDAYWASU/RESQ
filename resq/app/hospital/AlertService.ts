import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

let alarmSound: Audio.Sound | null = null;

export const setupNotifications = async () => {
  // 1. Request Permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  // 2. Pre-load the sound so it's ready to fire instantly
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/emergency_alarm.mp3'),
      { shouldPlay: false, volume: 1.0 }
    );
    alarmSound = sound;
    
    // Ensure the audio plays even if the phone is on "Silent/Vibrate" mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  } catch (error) {
    console.log("Error loading sound file:", error);
  }
  return true;
};

export const triggerAlarm = async (type: string) => {
  // 1. Show the visual notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🚨 CRITICAL EMERGENCY",
      body: `Incoming ${type.toUpperCase()} patient. Check Dashboard!`,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null,
  });

  // 2. Play the custom MP3
  if (alarmSound) {
    try {
      // Reset to beginning in case it was played before
      await alarmSound.setPositionAsync(0);
      await alarmSound.playAsync();
    } catch (error) {
      console.log("Playback error:", error);
    }
  }
};

// Optional: Function to stop the alarm once the doctor clicks "Accept"
export const stopAlarm = async () => {
  if (alarmSound) {
    await alarmSound.stopAsync();
  }
}; 