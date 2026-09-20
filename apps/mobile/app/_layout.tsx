import { Stack, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? '#d97706' : '#78716c';
  return <Text style={{ fontSize: 24, color }}>{name}</Text>;
}

function TabBar() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fef3c7' },
          headerTintColor: '#92400e',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          headerShown: false,
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="passwordRecovery" options={{ presentation: 'modal' }} />
        <Stack.Screen name="terms" options={{ presentation: 'modal' }} />
      </Stack>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#fef3c7' },
        headerTintColor: '#92400e',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
        tabBarActiveTintColor: '#d97706',
        tabBarInactiveTintColor: '#78716c',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#fde68a',
          paddingBottom: 4,
          paddingTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ focused }) => <TabBarIcon name="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabBarIcon name="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="exchanges"
        options={{
          title: 'Exchanges',
          tabBarIcon: ({ focused }) => <TabBarIcon name="📦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => <TabBarIcon name="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ focused }) => <TabBarIcon name="👥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabBarIcon name="👤" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabBarIcon name="⚙️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="userProfile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="exchangeRequest"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <TabBar />
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
