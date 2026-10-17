import { StyleSheet, View, Text } from 'react-native';
import { SpatialNavigationNode, DefaultFocus } from 'react-tv-space-navigation';
import { useState } from 'react';
import { scaledPixels } from '../hooks/useScale';
import { safeZones } from '../theme';
import { fitnessColors as colors } from '../theme/fitness';
import FocusablePressable from '../components/FocusablePressable';
import FitnessScreen from '../components/fitness/FitnessScreen';

export default function SettingsScreen() {
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [notifications, setNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const qualityOptions = ['Auto', '1080p', '720p', '480p'];
  return (
    <FitnessScreen title="Settings" eyebrow="YOUR PREFERENCES" drawer>
      <View style={styles.scrollContent}>
        {/* Video Quality Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Quality</Text>
          <SpatialNavigationNode orientation="horizontal">
            <View style={styles.optionsRow}>
              {qualityOptions.map((quality, index) =>
                index === 0 ? (
                  <DefaultFocus key={quality}>
                    <FocusablePressable
                      text={quality}
                      onSelect={() => setSelectedQuality(quality)}
                      style={[styles.optionButton, selectedQuality === quality && styles.selectedOption]}
                    />
                  </DefaultFocus>
                ) : (
                  <FocusablePressable
                    key={quality}
                    text={quality}
                    onSelect={() => setSelectedQuality(quality)}
                    style={[styles.optionButton, selectedQuality === quality && styles.selectedOption]}
                  />
                ),
              )}
            </View>
          </SpatialNavigationNode>
        </View>

        {/* Playback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>
          <SpatialNavigationNode orientation="vertical">
            <View style={styles.optionsColumn}>
              <FocusablePressable
                text={`Autoplay: ${autoplay ? 'On' : 'Off'}`}
                onSelect={() => setAutoplay(!autoplay)}
                style={styles.toggleButton}
              />
              <FocusablePressable
                text={`Notifications: ${notifications ? 'On' : 'Off'}`}
                onSelect={() => setNotifications(!notifications)}
                style={styles.toggleButton}
              />
            </View>
          </SpatialNavigationNode>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2025.11.04</Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <SpatialNavigationNode orientation="vertical">
            <View style={styles.optionsColumn}>
              <FocusablePressable
                text="Clear Cache (unavailable)"
                disabled
                onSelect={() => console.log('Clear cache')}
                style={styles.actionButton}
              />
              <FocusablePressable
                text="Sign Out (guest mode)"
                disabled
                onSelect={() => console.log('Sign out')}
                style={styles.actionButton}
              />
            </View>
          </SpatialNavigationNode>
        </View>
      </View>
    </FitnessScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
    zIndex: 100,
  },
  headerContainer: {
    width: '100%',
    height: scaledPixels(700),
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientLeft: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  innerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: scaledPixels(20),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    paddingTop: scaledPixels(16),
    paddingBottom: scaledPixels(safeZones.actionSafe.vertical + 60),
  },
  title: {
    fontSize: scaledPixels(48),
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    marginBottom: scaledPixels(32),
  },
  section: {
    marginBottom: scaledPixels(24),
    padding: scaledPixels(28),
    backgroundColor: colors.card,
    borderRadius: scaledPixels(20),
    borderWidth: scaledPixels(2),
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: scaledPixels(24),
    fontWeight: '600',
    color: colors.text,
    marginBottom: scaledPixels(20),
  },
  optionsRow: {
    flexDirection: 'row',
    gap: scaledPixels(16),
    flexWrap: 'wrap',
  },
  optionsColumn: {
    gap: scaledPixels(16),
  },
  optionButton: {
    marginEnd: scaledPixels(12),
    marginBottom: scaledPixels(12),
  },
  selectedOption: {
    backgroundColor: colors.primary,
  },
  toggleButton: {
    alignSelf: 'flex-start',
    minWidth: scaledPixels(300),
  },
  actionButton: {
    alignSelf: 'flex-start',
    minWidth: scaledPixels(250),
  },
  infoContainer: {
    backgroundColor: colors.card,
    borderRadius: scaledPixels(12),
    padding: scaledPixels(24),
    gap: scaledPixels(16),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: scaledPixels(24),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: scaledPixels(24),
    color: colors.text,
    fontWeight: '600',
  },
});
