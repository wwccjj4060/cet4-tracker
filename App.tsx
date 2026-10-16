import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDb } from './src/db';
import RootNavigator from './src/navigation/RootNavigator';
import { configureNotificationHandler, syncReminders } from './src/notifications';

configureNotificationHandler();

export default function App() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    getDb().then(
      () => {
        setState('ready');
        void syncReminders().catch(() => undefined);
      },
      (error: unknown) => {
        setMessage(error instanceof Error ? error.message : String(error));
        setState('error');
      },
    );
  }, []);

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorTitle}>数据库初始化失败</Text>
        <Text style={styles.errorDetail}>{message}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c0392b',
  },
  errorDetail: {
    marginTop: 8,
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
});
