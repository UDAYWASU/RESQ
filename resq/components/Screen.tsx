import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, StyleSheet } from 'react-native';
import React from 'react';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: any;
};

export default function Screen({ children, scroll = false, style }: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, style]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
});