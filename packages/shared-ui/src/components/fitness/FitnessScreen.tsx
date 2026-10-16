import BrandLogo from '../BrandLogo';
import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, type ScrollView } from 'react-native';
import { DrawerActions, useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SpatialNavigationRoot, SpatialNavigationScrollView, SpatialNavigationView } from 'react-tv-space-navigation';
import type { Direction } from '@bam.tech/lrud';
import type { RootStackParamList } from '../../navigation/types';
import { useMenuContext } from '../MenuContext';
import { useFormFit } from '../../hooks/FormFitContext';
import { getOpenDrawerDirection } from '../../utils/rtl';
import { scaledPixels as px } from '../../hooks/useScale';
import { fitnessColors as c } from '../../theme/fitness';
import FitnessSidebar from './FitnessSidebar';
import { FocusScrollContext } from './FocusScroll';
import { FitnessButton, ui } from './FitnessPrimitives';

export default function FitnessScreen({
  title,
  eyebrow,
  children,
  drawer = false,
  active = true,
  backAction,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  drawer?: boolean;
  active?: boolean;
  backAction?: () => void;
}) {
  const contentRef = useRef<View>(null);
  const revealFocused = useCallback((node: View) => {
    if (!contentRef.current) return;
    node.measureLayout(
      contentRef.current,
      (_x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - px(24)), animated: true });
      },
      () => {},
    );
  }, []);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToTop = useCallback(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), []);
  const focused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isOpen, toggleMenu } = useMenuContext();
  const { ready, storageWarning, plannerWarning } = useFormFit();
  const openMenu = useCallback(() => {
    toggleMenu(true);
    navigation.dispatch(DrawerActions.openDrawer());
  }, [toggleMenu, navigation]);
  const edge = useCallback(
    (direction: Direction) => {
      if (direction === 'up') scrollToTop();
      if (drawer && direction === getOpenDrawerDirection()) openMenu();
    },
    [drawer, openMenu, scrollToTop],
  );
  return (
    <SpatialNavigationRoot isActive={focused && !isOpen && active} onDirectionHandledWithoutMovement={edge}>
      <View
        style={styles.screen}
        accessibilityElementsHidden={!active}
        importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
        <View pointerEvents="none" accessible={false} style={styles.ambientTop} />
        <View pointerEvents="none" accessible={false} style={styles.ambientBottom} />
        <SpatialNavigationView direction="horizontal" style={styles.frame}>
          {drawer && (
            <FitnessSidebar
              title={
                title.includes('space') || title === 'Home'
                  ? 'Home'
                  : title.includes('Build')
                    ? 'Workouts'
                    : title.includes('session') || title.includes('Progress')
                      ? 'Progress'
                      : title
              }
            />
          )}
          <SpatialNavigationView direction="vertical" style={styles.main}>
            <View style={styles.header}>
              <View>
                <BrandLogo />
                <Text style={ui.small}>{eyebrow}</Text>
              </View>
              {drawer ? (
                <FitnessButton text="Menu" variant="compact" onSelect={openMenu} onFocus={scrollToTop} />
              ) : backAction ? (
                <FitnessButton text="Back" variant="compact" onSelect={backAction} onFocus={scrollToTop} />
              ) : null}
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {plannerWarning && (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.warning}>
                {plannerWarning}
              </Text>
            )}
            {storageWarning && (
              <Text accessibilityRole="alert" style={styles.warning}>
                {storageWarning}
              </Text>
            )}

            {ready ? (
              <SpatialNavigationScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.content}
                offsetFromStart={px(30)}>
                <FocusScrollContext.Provider value={revealFocused}>
                  <View ref={contentRef} collapsable={false}>
                    <SpatialNavigationView direction="vertical">{children}</SpatialNavigationView>
                  </View>
                </FocusScrollContext.Provider>
              </SpatialNavigationScrollView>
            ) : (
              <View
                style={styles.loading}
                accessibilityLiveRegion="polite"
                accessibilityLabel="Loading your local workouts">
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={ui.body}>Loading your local workouts...</Text>
              </View>
            )}
            <Text style={styles.remoteHint}>D-pad to move / OK to select / Back to return</Text>
          </SpatialNavigationView>
        </SpatialNavigationView>
      </View>
    </SpatialNavigationRoot>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: px(64),
    paddingVertical: px(38),
  },
  ambientTop: {
    position: 'absolute',
    top: px(-500),
    end: px(-150),
    width: px(900),
    height: px(900),
    borderRadius: px(450),
    backgroundColor: '#292159',
    opacity: 0.24,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: px(-650),
    start: px(-250),
    width: px(1000),
    height: px(1000),
    borderRadius: px(500),
    backgroundColor: '#12365A',
    opacity: 0.2,
  },
  frame: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, minWidth: 0, paddingHorizontal: px(48), paddingTop: px(32), paddingBottom: px(20) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: px(16) },
  brand: { color: c.text, fontSize: px(24), fontWeight: '800', letterSpacing: px(1) },
  brandAccent: { color: c.primary },
  title: { color: c.text, fontSize: px(36), fontWeight: '700', marginBottom: px(16) },
  scroll: { flex: 1 },
  content: { padding: px(24), paddingBottom: px(40) },
  remoteHint: { color: c.textSecondary, fontSize: px(18), lineHeight: px(28), marginBottom: px(12) },
  loading: { padding: px(40), alignItems: 'center', gap: px(20) },
  warning: { color: c.accent, fontSize: px(20), marginBottom: px(12) },
});
