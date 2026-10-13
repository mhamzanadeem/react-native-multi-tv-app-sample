// Matches the installed 1.0.2 implementation; it ships no TypeScript declarations.
declare module 'react-native-pixel-perfect' {
  export interface DesignSize { width: number; height: number; }
  export function create(designSize?: DesignSize): (size: number) => number;
  export const PREDEF_RES: Record<string, { px: DesignSize; dp: DesignSize }>;
}
