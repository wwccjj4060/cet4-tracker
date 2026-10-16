import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text } from 'react-native';

import AddRecordScreen from '../screens/AddRecordScreen';
import AddReviewItemScreen from '../screens/AddReviewItemScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReviewScreen from '../screens/ReviewScreen';
import StatsScreen from '../screens/StatsScreen';
import TodayScreen from '../screens/TodayScreen';
import type { RootStackParamList, RootTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function EmptyTabScreen() {
  return null;
}

function AddTabButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="添加记录"
      onPress={onPress}
      style={({ pressed }) => [styles.addButton, pressed ? styles.addButtonPressed : null]}
    >
      <Text style={styles.addButtonLabel}>＋</Text>
    </Pressable>
  );
}

function Tabs() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Tab.Screen name="Today" component={TodayScreen} options={{ title: '今日' }} />
      <Tab.Screen name="Review" component={ReviewScreen} options={{ title: '复习' }} />
      <Tab.Screen
        name="Add"
        component={EmptyTabScreen}
        options={{
          title: '',
          tabBarButton: () => <AddTabButton onPress={() => navigation.navigate('AddRecord')} />,
        }}
      />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: '统计' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddRecord"
        component={AddRecordScreen}
        options={{ title: '添加记录', presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddReviewItem"
        component={AddReviewItemScreen}
        options={{ title: '添加复习项', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  addButton: {
    top: -12,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f6fed',
  },
  addButtonPressed: {
    backgroundColor: '#2559c4',
  },
  addButtonLabel: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 32,
  },
});
