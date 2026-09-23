import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState, View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import { LanguageProvider } from './src/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Pause background refetching while the app is not active
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

function Gate() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={theme.colors.white} />
      </View>
    );
  }
  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer>
            <LanguageProvider>
              <AuthProvider>
                <StatusBar style="light" />
                <Gate />
              </AuthProvider>
            </LanguageProvider>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.navy },
});
