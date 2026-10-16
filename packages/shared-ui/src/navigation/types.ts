import type { NavigatorScreenParams } from '@react-navigation/native';
import type { WorkoutGoal } from '../types/workout';
export type RootStackParamList = {
  DrawerNavigator: NavigatorScreenParams<DrawerParamList> | undefined;
  WorkoutSetup: { goal?: WorkoutGoal } | undefined;
  WorkoutPlan: { planId: string };
  WorkoutSession: { planId: string };
  WorkoutComplete: { summaryId: string };
  Details: {
    title: string;
    description: string;
    headerImage: string;
    movie: string;
    category?: string;
    genres?: string[];
    releaseYear?: number;
    rating?: number;
    ratingCount?: number;
    contentRating?: string;
    duration?: number;
  };
  Player: {
    movie: string;
    headerImage: string;
  };
};

export type DrawerParamList = {
  Home: undefined;
  Workouts: undefined;
  Progress: undefined;
  AwsDemo: undefined;
  Media: undefined;
  Explore: undefined;
  TV: undefined;
  Settings: undefined;
};
