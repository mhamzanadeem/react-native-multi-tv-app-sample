import BrandLogo from '../BrandLogo';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { DrawerActions, useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import type { Direction } from '@bam.tech/lrud';
import type { RootStackParamList } from '../../navigation/types';
import { useMenuContext } from '../MenuContext';
import { useFormFit } from '../../hooks/FormFitContext';
import { getOpenDrawerDirection } from '../../utils/rtl';
import { scaledPixels as px } from '../../hooks/useScale';
import { fitnessColors as c } from '../../theme/fitness';
import { FocusScrollContext, focusScrollTarget } from './FocusScroll';
import { FitnessButton, ui } from './FitnessPrimitives';

export default function FitnessScreen({
  title,
  progress,
  eyebrow,
  children,
  drawer = false,
  menuInContent = false,
  active = true,
  backAction,
}: {
  title: string;
  progress?: React.ReactNode;
  eyebrow: string;
  children: React.ReactNode;
  drawer?: boolean;
  menuInContent?: boolean;
  active?: boolean;
  backAction?: () => void;
}) {
  const contentRef = useRef<View>(null);
  const [contentFocusEpoch, setContentFocusEpoch] = useState(0);
  const viewportHeight = useRef(0);
  const scrollY = useRef(0);
  const contentHeight = useRef(0);
  const [canScroll, setCanScroll] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const updateScrollBounds = useCallback(() => {
    const maximum = Math.max(0, contentHeight.current - viewportHeight.current);
    setCanScroll(viewportHeight.current > 0 && maximum > 2);
    setAtBottom(maximum > 2 && scrollY.current >= maximum - 2);
  }, []);
  const jumpToEdge = useCallback(() => {
    const maximum = Math.max(0, contentHeight.current - viewportHeight.current);
    const target = scrollY.current >= maximum - 2 ? 0 : maximum;
    scrollY.current = target;
    scrollRef.current?.scrollTo({ y: target, animated: true });
    updateScrollBounds();
  }, [updateScrollBounds]);
  const revealFocused = useCallback((node: View) => {
    if (!contentRef.current) return;
    node.measureLayout(
      contentRef.current,
      (_x, y, _width, height) => {
        const target = focusScrollTarget(y, height, scrollY.current, viewportHeight.current, px(24));
        if (target !== null && Math.abs(target - scrollY.current) > 1) {
          scrollY.current = target;
          scrollRef.current?.scrollTo({ y: target, animated: true });
        }
      },
      () => {},
    );
  }, []);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToTop = useCallback(() => {
    scrollY.current = 0;
    setAtBottom(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);
  const enterFromHeader = useCallback(() => {
    scrollToTop();
    // Clear the content group's remembered descendant (for example Previous step).
    // The next Down must enter the first row in display order, not that old control.
    // Draft/session state belongs to the screen outside this presentation subtree.
    setContentFocusEpoch((epoch) => epoch + 1);
  }, [scrollToTop]);
  const focused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isOpen, requestOpen } = useMenuContext();
  const { ready, storageWarning, plannerWarning, installationId } = useFormFit();
  const openMenu = useCallback(() => {
    if (requestOpen) requestOpen();
    else navigation.dispatch(DrawerActions.openDrawer());
  }, [requestOpen, navigation]);
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
          <SpatialNavigationView direction="vertical" style={styles.main}>
            <View style={styles.header}>
              {drawer && !menuInContent && (
                <FitnessButton
                  text="Menu"
                  icon="menu"
                  variant="compact"
                  onSelect={openMenu}
                  onFocus={enterFromHeader}
                />
              )}
              <View style={{ flex: 1 }}>
                <BrandLogo large />
                <Text selectable style={styles.guestId}>
                  Guest TV ID: {installationId ?? 'Unavailable'}
                </Text>
                <Text style={ui.small}>{eyebrow}</Text>
              </View>
              {!drawer && backAction ? (
                <FitnessButton text="Back" variant="compact" onSelect={backAction} onFocus={enterFromHeader} />
              ) : null}
            </View>
            {progress}
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
              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.content}
                onLayout={(event) => {
                  viewportHeight.current = event.nativeEvent.layout.height;
                  updateScrollBounds();
                }}
                onScroll={(event) => {
                  scrollY.current = event.nativeEvent.contentOffset.y;
                  updateScrollBounds();
                }}
                onContentSizeChange={(_width, height) => {
                  contentHeight.current = height;
                  updateScrollBounds();
                }}
                scrollEventThrottle={16}>
                <FocusScrollContext.Provider value={revealFocused}>
                  <View ref={contentRef} collapsable={false}>
                    <SpatialNavigationView key={contentFocusEpoch} direction="vertical">
                      {children}
                    </SpatialNavigationView>
                  </View>
                </FocusScrollContext.Provider>
              </ScrollView>
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
          <SpatialNavigationView direction="vertical" style={styles.scrollShortcut}>
            <FitnessButton
              text={atBottom ? 'Back to top' : 'Jump to bottom'}
              icon={atBottom ? 'scroll-up' : 'scroll-down'}
              onSelect={jumpToEdge}
              disabled={!ready || !canScroll || !active}
              testID="scroll-shortcut"
            />
          </SpatialNavigationView>
        </SpatialNavigationView>
      </View>
    </SpatialNavigationRoot>
  );
}
const styles = StyleSheet.create({
  guestId: {
    color: '#E2EBFF',
    backgroundColor: '#27334D',
    fontSize: px(26),
    lineHeight: px(36),
    fontWeight: '600',
    paddingHorizontal: px(16),
    paddingVertical: px(8),
    borderRadius: px(10),
    alignSelf: 'flex-start',
    marginVertical: px(10),
    flexShrink: 1,
  },
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
    backgroundColor: c.primary,
    opacity: 0.035,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: px(-650),
    start: px(-250),
    width: px(1000),
    height: px(1000),
    borderRadius: px(500),
    backgroundColor: c.primary,
    opacity: 0.025,
  },
  frame: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, minWidth: 0, paddingHorizontal: px(48), paddingTop: px(32), paddingBottom: px(20) },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: px(24),
    marginBottom: px(16),
  },
  brand: { color: c.text, fontSize: px(24), fontWeight: '800', letterSpacing: px(1) },
  brandAccent: { color: c.primary },
  title: { color: c.text, fontSize: px(36), fontWeight: '700', marginBottom: px(16) },
  scroll: { flex: 1 },
  content: { padding: px(24), paddingBottom: px(40) },
  scrollShortcut: { position: 'absolute', end: 0, bottom: 0, width: px(340), alignItems: 'flex-end' },
  remoteHint: {
    color: c.textSecondary,
    fontSize: px(18),
    lineHeight: px(28),
    marginBottom: px(12),
    minHeight: px(112),
    paddingEnd: px(360),
  },
  loading: { padding: px(40), alignItems: 'center', gap: px(20) },
  warning: { color: c.accent, fontSize: px(20), marginBottom: px(12) },
});
