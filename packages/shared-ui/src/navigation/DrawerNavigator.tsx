import { StyleSheet, View, Platform, I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createDrawerNavigator } from '@react-navigation/drawer';
import CustomDrawerContent from '../components/CustomDrawerContent';
import { scaledPixels } from '../hooks/useScale';
import { DrawerParamList } from './types';

// Import screens
import MediaHomeScreen from '../screens/HomeScreen';
import HomeScreen from '../screens/fitness/FitnessHomeScreen';
import WorkoutSetupScreen from '../screens/fitness/WorkoutSetupScreen';
import WorkoutProgressScreen from '../screens/fitness/WorkoutProgressScreen';
import ExploreScreen from '../screens/ExploreScreen';
import TVScreen from '../screens/TVScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MockAwsScreen from '../screens/fitness/MockAwsScreen';

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function DrawerNavigator() {
  const styles = drawerStyles;

  const navigationContent = (
    <Drawer.Navigator
      drawerContent={CustomDrawerContent}
      initialRouteName="Home"
      defaultStatus="closed"
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: '#3498db',
        drawerActiveTintColor: '#ffffff',
        drawerInactiveTintColor: '#bdc3c7',
        drawerStyle: styles.drawerStyle,
        drawerLabelStyle: styles.drawerLabelStyle,
        drawerType: 'front',
        swipeEnabled: false,
        drawerPosition: I18nManager.isRTL ? 'right' : 'left',
      }}>
      <Drawer.Screen name="Home" component={HomeScreen} options={{ drawerLabel: 'Home' }} />
      <Drawer.Screen name="Workouts" component={WorkoutSetupScreen} options={{ drawerLabel: 'Workouts' }} />
      <Drawer.Screen name="Progress" component={WorkoutProgressScreen} options={{ drawerLabel: 'Progress' }} />
      <Drawer.Screen name="AwsDemo" component={MockAwsScreen} options={{ drawerLabel: 'AWS demo lab' }} />
      <Drawer.Screen name="Media" component={MediaHomeScreen} options={{ drawerLabel: 'Media sample' }} />
      <Drawer.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          drawerLabel: 'Explore',
        }}
      />
      <Drawer.Screen
        name="TV"
        component={TVScreen}
        options={{
          drawerLabel: 'TV',
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerLabel: 'Settings',
        }}
      />
    </Drawer.Navigator>
  );

  // On TV platforms, don't use GestureHandlerRootView as we use remote control navigation
  if (Platform.isTV) {
    return <View style={{ flex: 1 }}>{navigationContent}</View>;
  }

  // On mobile/web, use GestureHandlerRootView for swipe gestures
  return <GestureHandlerRootView style={{ flex: 1 }}>{navigationContent}</GestureHandlerRootView>;
}

const drawerStyles = StyleSheet.create({
  drawerStyle: {
    width: scaledPixels(300),
    backgroundColor: '#2c3e50',
    paddingTop: scaledPixels(0),
  },
  drawerLabelStyle: {
    fontSize: scaledPixels(18),
    fontWeight: 'bold',
    marginStart: scaledPixels(10),
  },
});
