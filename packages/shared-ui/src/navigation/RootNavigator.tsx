import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import DrawerNavigator from './DrawerNavigator';
import DetailsScreen from '../screens/DetailsScreen';
import PlayerScreen from '../screens/PlayerScreen';

import WorkoutSetupScreen from '../screens/fitness/WorkoutSetupScreen';
import WorkoutPlanScreen from '../screens/fitness/WorkoutPlanScreen';
import WorkoutSessionScreen from '../screens/fitness/WorkoutSessionScreen';
import WorkoutCompleteScreen from '../screens/fitness/WorkoutCompleteScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="DrawerNavigator" component={DrawerNavigator} />
      <Stack.Screen name="WorkoutSetup" component={WorkoutSetupScreen} />
      <Stack.Screen name="WorkoutPlan" component={WorkoutPlanScreen} />
      <Stack.Screen name="WorkoutSession" component={WorkoutSessionScreen} />
      <Stack.Screen name="WorkoutComplete" component={WorkoutCompleteScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Player" component={PlayerScreen} />
    </Stack.Navigator>
  );
}
