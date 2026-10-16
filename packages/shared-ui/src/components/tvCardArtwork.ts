import type { ImageSourcePropType } from 'react-native';

/** Static requires keep all original illustrations available offline on every TV. */
const artwork = {
  strength: require('../assets/tv-cards/strength.png'),
  cardio: require('../assets/tv-cards/cardio.png'),
  person: require('../assets/tv-cards/person.png'),
  mobility: require('../assets/tv-cards/mobility.png'),
  walk: require('../assets/tv-cards/walk.png'),
  clock: require('../assets/tv-cards/clock.png'),
  cloud: require('../assets/tv-cards/cloud.png'),
  chart: require('../assets/tv-cards/chart.png'),
  settings: require('../assets/tv-cards/settings.png'),
  home: require('../assets/tv-cards/home.png'),
  plan: require('../assets/tv-cards/plan.png'),
  back: require('../assets/tv-cards/back.png'),
  play: require('../assets/tv-cards/play.png'),
  pause: require('../assets/tv-cards/pause.png'),
  stop: require('../assets/tv-cards/stop.png'),
  skip: require('../assets/tv-cards/skip.png'),
  check: require('../assets/tv-cards/check.png'),
  chair: require('../assets/tv-cards/chair.png'),
  mat: require('../assets/tv-cards/mat.png'),
  cycle: require('../assets/tv-cards/cycle.png'),
  row: require('../assets/tv-cards/row.png'),
  band: require('../assets/tv-cards/band.png'),
  kettlebell: require('../assets/tv-cards/kettlebell.png'),
  refresh: require('../assets/tv-cards/refresh.png'),
  grid: require('../assets/tv-cards/grid.png'),
};
export type TVCardIcon = keyof typeof artwork;
export function cardIconForLabel(label: string): TVCardIcon {
  const text = label.toLowerCase();
  if (/back|exit|return to/.test(text)) return 'back';
  if (/pause/.test(text)) return 'pause';
  if (/skip|next exercise/.test(text)) return 'skip';
  if (/end workout|end session|sign out/.test(text)) return 'stop';
  if (/finish|complete|keep exercising/.test(text)) return 'check';
  if (/aws|cloud|lambda/.test(text)) return 'cloud';
  if (/refresh|clear|reset|change exercise order/.test(text)) return 'refresh';
  if (/progress|activity|history|summary/.test(text)) return 'chart';
  if (/settings|preferences|quality|autoplay|notification/.test(text)) return 'settings';
  if (/home|on this tv/.test(text)) return 'home';
  if (/minute|rest|recovery|time/.test(text)) return 'clock';
  if (/kettlebell/.test(text)) return 'kettlebell';
  if (/band/.test(text)) return 'band';
  if (/chair|seated/.test(text)) return 'chair';
  if (/cycling|bike/.test(text)) return 'cycle';
  if (/rowing/.test(text)) return 'row';
  if (/pilates|mat|floor/.test(text)) return 'mat';
  if (/walking|march|step|dance/.test(text)) return 'walk';
  if (/cardio|interval|hiit|boxing|impact|endurance/.test(text)) return 'cardio';
  if (/mobility|flexib|stretch|yoga|balance/.test(text)) return 'mobility';
  if (/strength|dumbbell|bodyweight|push|squat|lunge|curl|lift|plank|hinge|dead|bridge/.test(text)) return 'strength';
  if (/beginner|intermediate|advanced|body|core|standing|equipment|fitness/.test(text)) return 'person';
  if (/start|begin|resume|continue|play/.test(text)) return 'play';
  if (/plan|workout|generate|customiz/.test(text)) return 'plan';
  return 'grid';
}
export function resolveCardArtwork(label: string, icon?: string): ImageSourcePropType {
  const key =
    icon && Object.prototype.hasOwnProperty.call(artwork, icon) ? (icon as TVCardIcon) : cardIconForLabel(label);
  return artwork[key];
}
