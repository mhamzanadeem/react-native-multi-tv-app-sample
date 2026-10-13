# React Native Multi-TV App Sample

[![React Native](https://img.shields.io/badge/React%20Native-v0.81-blue.svg)](https://reactnative.dev/)
[![License: MIT-0](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/AmazonAppDev/react-native-multi-tv-app-sample/blob/main/LICENSE)

A production-ready TV application template built with React Native, supporting Android TV, Apple TV, Fire TV (with Fire OS), Fire TV (with Vega OS) and Web TV platforms. This monorepo showcases best practices for building cross-platform TV applications with shared UI components, efficient focus management, and platform-specific optimizations.

![Demo GIF](./tvdemo.gif)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Building and Running](#building-and-running)
- [Development](#development)
- [Project Structure](#project-structure)
- [Technologies](#technologies)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

### Core Functionality

- **Multi-Platform Support**: Single codebase running on Android TV, Apple TV, Fire TV FOS, Fire TV Vega OS and Web
- **Video Playback**: Integrated video player with [react-native-video](https://github.com/TheWidlarzGroup/react-native-video)
- **Spatial Navigation**: TV-optimized focus management with [React TV Space Navigation](https://github.com/bamlab/react-tv-space-navigation)
- **Remote Control Support**: Native remote control integration for all TV platforms

### UI Components

- **Drawer Navigation**: Customizable left-side drawer with menu items
- **Grid Layouts**: Responsive content grids optimized for TV screens
- **Dynamic Hero Banner**: Header image that updates based on focused content
- **Detail Screens**: Rich content detail pages with metadata and actions

### Video Player Features

- **Overlay Controls**: Custom video controls with spatial navigation support
  - Play/pause button with visual state
  - Seek bar with current time and duration display
  - Exit button to return to previous screen
  - Auto-hide after 5 seconds of inactivity
- **Buffering Indicators**: Visual feedback during video loading and seeking
- **Remote Control Integration**: Full support for play/pause, seek forward/backward (10s intervals), and exit
- **Platform Optimizations**:
  - Native controls on iOS/tvOS
  - Custom overlay on Android TV, Fire TV, and Web
  - Hardware-accelerated rendering on Fire TV Vega with W3C Media APIs

### Dynamic Content Loading

- **External Catalog API**: Fetch movie content dynamically from remote JSON endpoint
- **Rich Metadata Support**:
  - Genres, ratings, and content ratings
  - Release year and duration
  - Trending flags
  - Multiple video source formats
- **Type-Safe Transforms**: Automatic conversion from catalog API format to UI-ready data structures
- **Error Handling**: Graceful fallback and error states for failed API requests
- **Extensible**: Easy to swap catalog endpoint or add new metadata fields

### Architecture

- **Monorepo Structure**: Yarn workspaces with apps and shared packages
- **Shared UI Library**: Reusable components across all platforms
- **Platform-Specific Code**: Automatic resolution of `.android.ts`, `.ios.ts`, `.kepler.ts` files
- **Type Safety**: Full TypeScript support with shared configurations

### App Variants

**expo-multi-tv**

- Universal application built with Expo and react-native-tvos
- Supports Android TV, Apple TV, Fire TV Fire OS, and Web
- Uses React Navigation for screen management
- Cross-platform focus management

**vega**

- Fire TV with Vega OS optimized build using Amazon Vega SDK
- Optimized performance for Fire TV devices
- Native remote control support via TVEventHandler

Both apps share components from the `@multi-tv/shared-ui` package.

## Architecture

This project uses a monorepo structure with Yarn workspaces to manage multiple packages and applications.

```
react-native-multi-tv-app-sample/
├── apps/
│   ├── expo-multi-tv/       # Universal TV app (Android TV, Apple TV, Fire TV FOS, Web)
│   └── vega/                # Fire TV Vega optimized app (Vega SDK)
├── packages/
│   └── shared-ui/           # Shared components, screens, and navigation
├── package.json             # Workspace configuration
└── tsconfig.base.json       # Shared TypeScript configuration
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│       React Native Multi-TV Monorepo                    │
├──────────────────────────┬──────────────────────────────┤
│ Apps                     │ Packages                     │
├──────────────────────────┼──────────────────────────────┤
│ expo-multi-tv            │ shared-ui                    │
│   ├─ Expo SDK 54         │   ├─ Components              │
│   ├─ React Navigation    │   ├─ Screens                 │
│   ├─ react-native-tvos   │   ├─ Navigation              │
│   └─ Platforms:          │   ├─ Hooks                   │
│       • Android TV       │   ├─ Theme                   │
│       • Apple TV         │   └─ Remote Control          │
│       • Fire TV          │       ├─ .android.ts         │
│       • Web              │       ├─ .ios.ts             │
│                          │       └─ .kepler.ts          │
│ vega                     │                              │
│   ├─ Vega SDK            │                              │
│   ├─ @amazon-devices/*   │                              │
│   └─ Platform: Vega OS   │                              │
└──────────────────────────┴──────────────────────────────┘
```

The `@multi-tv/shared-ui` package contains all reusable UI components, screens, and navigation logic. Platform-specific implementations use file extensions (`.android.ts`, `.ios.ts`, `.kepler.ts`) that Metro bundler automatically resolves at build time.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher
- **Yarn**: v4.5.0 (configured via packageManager field)
- **Platform-specific tools**:
  - **Android TV**: Android Studio with Android SDK
  - **Apple TV**: Xcode (macOS required) with tvOS SDK
  - **Fire TV**: [Amazon Vega SDK](https://developer.amazon.com/docs/vega/0.21/install-vega-sdk.html)
  - **Web**: Modern web browser

### Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/AmazonAppDev/react-native-multi-tv-app-sample.git
cd react-native-multi-tv-app-sample

# Install all dependencies
yarn install
```

## Building and Running

### Quick Start

Run the universal app on different platforms:

```bash
# Android TV and Fire TV FOS
yarn dev:android

# Apple TV
yarn dev:ios

# Web
yarn dev:web

```

### Platform-Specific Instructions

#### Android TV

1. Start Metro bundler:

   ```bash
   yarn dev
   ```

2. In a new terminal, run on Android TV:
   ```bash
   yarn dev:android
   ```

Or directly from the app directory:

```bash
cd apps/expo-multi-tv
yarn android
```

#### Apple TV

1. Start Metro bundler:

   ```bash
   yarn dev
   ```

2. In a new terminal, run on Apple TV:
   ```bash
   yarn dev:ios
   ```

Or directly from the app directory:

```bash
cd apps/expo-multi-tv
yarn ios
```

#### Web - Useful for LG WebOS and Tizen

Development server:

```bash
yarn dev:web
```

Or directly from the app directory:

```bash
cd apps/expo-multi-tv
yarn web
```

Production build:

```bash
cd apps/expo-multi-tv
npx expo export --platform web
npx serve dist
```

#### Fire TV (Vega)

For the Fire TV optimized build:

```bash
# Development build
yarn dev:vega

# Production build
yarn build:vega

# Debug build
yarn build:vega:debug
```

Or directly from the app directory:

```bash
cd apps/vega
yarn build
```

### Available Commands

#### Workspace Commands

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `yarn dev`         | Start expo-multi-tv Metro bundler |
| `yarn dev:android` | Run on Android TV                 |
| `yarn dev:ios`     | Run on Apple TV                   |
| `yarn dev:web`     | Run on Web                        |
| `yarn dev:vega`    | Start vega Metro bundler          |
| `yarn build:vega`  | Build vega for Fire TV            |
| `yarn format`      | Format code with Prettier         |
| `yarn clean:all`   | Clean all node_modules            |

#### App-Specific Commands

Navigate to the app directory first:

```bash
# expo-multi-tv
cd apps/expo-multi-tv
yarn start      # Start Metro bundler
yarn android    # Run on Android TV
yarn ios        # Run on Apple TV
yarn web        # Run on Web
yarn test       # Run tests
yarn lint       # Lint code

# vega
cd apps/vega
yarn start      # Start Metro bundler
yarn build      # Build for Fire TV
yarn test       # Run tests
yarn lint       # Lint code
```

## Development

### One-command Android TV startup (Windows)

From the repository root on the existing `hackathon` branch:

```powershell
cd C:\tvapp
yarn.cmd tv:start
```

Prerequisites: Node.js compatible with this Expo checkout, Yarn 4.5.0, dependencies installed with `yarn.cmd install --immutable`, JDK 17 (Java on PATH and a valid JAVA_HOME if set), and the existing generated `apps/expo-multi-tv/android` project. In Android Studio's SDK Manager install Platform-Tools, Android Emulator, the project's SDK platform (currently API 36), and build tools requested by Gradle. Accept SDK licenses there. Device Manager should contain an Android TV AVD named `Hackathon_TV` with its system image installed and Windows virtualization enabled.

The launcher discovers the SDK from `ANDROID_HOME`, `ANDROID_SDK_ROOT`, existing `local.properties`, common SDK locations, or tools on PATH, validating both executables before use. It sets SDK variables/PATH only in its child process, updates only `sdk.dir` in the ignored native `local.properties`, lists devices, reuses a running TV emulator, or starts `Hackathon_TV` and waits up to five minutes for Android and its package manager. It then calls the existing `yarn.cmd dev:android` workflow with the selected AVD name. Phones are not selected. Offline unidentified emulators cause a clear stop to avoid duplicate startup. It neither installs dependencies nor runs a clean prebuild. A failed build remains a failed command.

```powershell
# Read-only project diagnostics; does not write properties, boot an AVD, or build.
yarn.cmd tv:start -CheckOnly
# For a custom SDK location, copy the real Android SDK Location from SDK Manager.
yarn.cmd tv:start -SdkPath "D:\Android SDK"
# Optional: select another existing TV AVD or extend the boot timeout.
yarn.cmd tv:start -AvdName Hackathon_TV -BootTimeoutSeconds 600
```

For an undetected SDK, open Android Studio > Settings > Languages & Frameworks > Android SDK, or Tools > SDK Manager, and copy **Android SDK Location**. For a missing AVD, create one in Device Manager using an Android TV device/system image and the required name. If an emulator is offline, allow it to finish starting or close it through Device Manager and retry. For startup/boot failures, launch it in Device Manager to inspect the system-image or virtualization error. The launcher leaves emulators running on failure and never wipes their data.

If ADB reports `\.android` or permission denied, run this command in a normal PowerShell terminal under your Windows account, outside any restricted automation sandbox. Check your profile path and any `ANDROID_USER_HOME`, `ANDROID_EMULATOR_HOME`, or `ANDROID_AVD_HOME` overrides; correct stale overrides in that terminal. Inspect the affected directory's ownership/permissions with Windows Properties > Security, or ask your administrator if policy-managed. Do not delete `.android`, reset ADB keys, or loosen ACLs. Android's directory variables are documented in [Android SDK environment variables](https://developer.android.com/tools/variables). The launcher reports this failure without attempting a security workaround.

The root command locates Windows PowerShell through `SystemRoot`, so PowerShell itself need not be on PATH. Its `-ExecutionPolicy Bypass` applies only to that launched process and does not change saved user/machine policies; organization-enforced policy still takes precedence. The script also supports PowerShell 7 when invoked directly with `pwsh -File ./scripts/start-tv.ps1`. SDK/PATH changes do not persist in the parent terminal, so a standalone `adb` command there may still need its full SDK path.

Press **Ctrl+C** to stop the development server/build. To close just the app, use the emulator's Home button. To stop the emulator, close its window or stop it in Device Manager. For a command-line stop, use the discovered SDK's full ADB path and the serial printed by the launcher: `& "<SDK>\platform-tools\adb.exe" -s emulator-5554 emu kill` (replace the example serial with your actual device).

### Hackathon validation on Windows

Use Yarn 4.5.0. If PowerShell blocks `yarn.ps1`, use `yarn.cmd` for the same commands.

```powershell
yarn.cmd install --immutable
yarn.cmd workspace @multi-tv/shared-ui run typecheck
yarn.cmd workspace @multi-tv/expo-multi-tv run typecheck
yarn.cmd workspace @multi-tv/shared-ui run lint
yarn.cmd workspace @multi-tv/expo-multi-tv run lint
yarn.cmd workspace @multi-tv/shared-ui run test --runInBand --silent
yarn.cmd workspace @multi-tv/expo-multi-tv run start
```

Yarn uses workspace-limited node_modules hoisting. Shared native/UI imports are peer dependencies supplied by each app; `mitt` and `@bam.tech/lrud` are direct shared dependencies. `tsconfig.consumer.json` resolves shared peer types against the primary Expo app without installing another React or React Native runtime in shared UI. The shared typecheck keeps its full source include and checks Vega media imports against installed Vega packages, but it does not certify the Vega runtime against Expo's React 19/TV native types. Vega still uses its own runtime and Metro aliases.

Shared lint and tests use the Expo workspace's existing ESLint/Babel/Jest toolchain. The shared test command intentionally runs the common suite in `apps/expo-multi-tv/__tests__` with watch mode disabled. Plan tests cover all 600 valid goal/level/duration/equipment combinations. The planner repeats complete eligible circuits for longer sessions; repeated exercise IDs across circuits are intentional. Estimates include inter-set rest and 15-second transitions, and can finish short of the target when the next exercise would exceed the one-minute overshoot allowance.

Metro remote configuration is loaded before navigation roots mount so both TV remotes and web keyboard focus can subscribe. Validate actual focus, drawer/Back navigation, video seeking and pause on Android TV after building. A successful Metro export verifies bundling, not native playback or device behavior.

Expo SDK 54 is compatible with React 19.1 and React Native TV 0.81, but this checkout has older Expo module versions, react-native-web 0.19, a pre-release TV runtime and an SDK-51-era TV config plugin. Run `yarn.cmd workspace @multi-tv/expo-multi-tv exec expo install --check` before a coordinated native dependency alignment. Do not use `--fix` or clean prebuild automatically; preserve the native TV configuration and separate Vega dependencies.


### Project Structure

The monorepo contains the following packages:

#### `@multi-tv/expo-multi-tv`

Universal TV application built with Expo, supporting Android TV, Apple TV, Fire TV, and Web.

**Key Technologies:**

- Expo SDK 54
- React Navigation 7
- react-native-tvos
- React TV Space Navigation

#### `@multi-tv/vega`

Fire TV optimized application using Amazon's Vega SDK.

**Key Technologies:**

- Amazon Vega SDK
- @amazon-devices packages
- Native Fire TV remote integration
- Custom navigation optimizations

#### `@multi-tv/shared-ui`

Shared component library used by both applications.

**Exports:**

- **Components**: `FocusablePressable`, `CustomDrawerContent`, `MenuContext`
- **Screens**: `HomeScreen`, `DetailsScreen`, `PlayerScreen`, `ExploreScreen`, `TVScreen`
- **Navigation**: `DrawerNavigator`, `RootNavigator`, `AppNavigator`
- **Hooks**: `scaledPixels`, `useMenuContext`
- **Theme**: Centralized theming configuration
- **Remote Control**: Platform-specific remote control managers

### Adding New Features

1. Develop shared components in `packages/shared-ui/src/`
2. Add platform-specific implementations using file extensions:
   - `.android.ts` for Android TV
   - `.ios.ts` for Apple TV
   - `.kepler.ts` for Fire TV
3. Export from `packages/shared-ui/src/index.ts`
4. Import in apps via `@multi-tv/shared-ui`

Example:

```typescript
// packages/shared-ui/src/components/MyComponent.tsx
export const MyComponent = () => {
  /* ... */
};

// packages/shared-ui/src/index.ts
export { MyComponent } from './components/MyComponent';

// apps/expo-multi-tv/App.tsx
import { MyComponent } from '@multi-tv/shared-ui';
```

### Remote Control Implementation

The project includes platform-specific remote control managers:

| Platform               | Implementation                    | Technology            |
| ---------------------- | --------------------------------- | --------------------- |
| Android TV/Fire TV FOS | `RemoteControlManager.android.ts` | react-native-keyevent |
| Apple TV               | `RemoteControlManager.ios.ts`     | Native tvOS events    |
| Fire TV Vega OS        | `RemoteControlManager.kepler.ts`  | Kepler TVEventHandler |

All managers implement `RemoteControlManagerInterface` and integrate with `react-tv-space-navigation`.

#### Remote Control Key Mappings

The following keys are supported across all platforms in the video player:

| Key/Button   | Action                   | Platforms           |
| ------------ | ------------------------ | ------------------- |
| PlayPause    | Toggle play/pause        | All                 |
| Select/Enter | Activate focused item    | All                 |
| Back         | Exit player or go back   | All                 |
| Left         | Seek backward 10 seconds | All (in player)     |
| Right        | Seek forward 10 seconds  | All (in player)     |
| FastForward  | Seek forward 10 seconds  | All (in player)     |
| Rewind       | Seek backward 10 seconds | All (in player)     |
| Up/Down      | Navigate menu items      | All (in navigation) |

**Platform-Specific Notes:**

- **iOS/tvOS**: Uses native video controls by default; custom overlay disabled
- **Android TV/Fire TV**: Custom overlay with spatial navigation for all controls
- **Web**: Keyboard support with arrow keys and spacebar for play/pause
- **Fire TV Vega**: Hardware-accelerated video with W3C Media APIs

## Technologies

This project is built with modern React Native and TV development tools:

| Technology                | Version | Purpose                    |
| ------------------------- | ------- | -------------------------- |
| React Native              | v0.81   | Core framework (tvOS fork) |
| Expo                      | SDK 54  | Development platform       |
| TypeScript                | v5.7    | Type safety                |
| Yarn Workspaces           | v4.5    | Monorepo management        |
| React Navigation          | v7      | Screen navigation          |
| react-tv-space-navigation | v6.0.0-beta1   | TV focus management        |
| react-native-video        | Latest  | Video playback             |
| Amazon Vega SDK           | Latest  | Fire TV Vega OS            |

## Contributing

Contributions are welcome! This project is an open-source sample designed to help developers build TV applications.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`yarn test:all && yarn lint:all`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Use conventional commit messages

## Troubleshooting

### iOS Build Issues

**Error: "can't access lexical declaration 'X' before initialization"**

- This typically occurs when functions are referenced before they're defined
- Solution: Functions should be defined before useEffect hooks that reference them

**Error: "No such file or directory: node"**

- The Xcode build can't find the Node.js binary
- Solution: Update `apps/expo-multi-tv/ios/.xcode.env.local` with correct Node path:
  ```bash
  export NODE_BINARY=/opt/homebrew/bin/node  # or your node path
  ```
- Find your node path with: `which node`
- Note: `.xcode.env.local` is gitignored (machine-specific configuration)

**Pods Installation Issues**

- Clean and reinstall:
  ```bash
  cd apps/expo-multi-tv/ios
  rm -rf Pods Podfile.lock
  pod install
  ```

### Android TV Build Issues

**Metro Bundler Port Conflicts**

- If port 8081 is in use:
  ```bash
  yarn start --port 8082
  ```

**ADB Device Not Found**

- Ensure Android TV/Fire TV is connected:
  ```bash
  adb devices
  adb connect <device-ip>:5555
  ```

### Fire TV Vega Issues

**Vega SDK Not Found**

- Ensure Vega SDK is installed and in PATH
- Check SDK path: `echo $KEPLER_SDK_HOME`
- Download from: [Amazon Vega Developer Portal](https://developer.amazon.com/vega)

### Web Platform Issues

**Video Player White Screen**

- Check browser console for JavaScript errors
- Ensure catalog API is accessible
- Verify video URLs are CORS-enabled

**Spatial Navigation Not Working**

- Use keyboard arrows for navigation on web
- Focus management requires keyboard or gamepad input

### Common Issues

**"Module not found" Errors**

- Clear cache and reinstall:
  ```bash
  yarn clean:all
  yarn install
  ```

**TypeScript Errors**

- Run type checking:
  ```bash
  yarn typecheck
  ```

**Video Playback Issues**

- Verify video URLs are accessible
- Check network connectivity
- Ensure video format is supported (MP4 recommended)

## License

This project is licensed under the MIT-0 License - see the [LICENSE](./LICENSE) file for details.

## Resources

- [React Native TV OS](https://github.com/react-native-tvos/react-native-tvos) - TV platform support
- [React TV Space Navigation](https://github.com/bamlab/react-tv-space-navigation) - Spatial navigation library
- [Amazon Kepler Developer Portal](https://developer.amazon.com/vega) - Fire TV development resources
- [Expo Documentation](https://expo.dev) - Expo SDK documentation

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

Made for TV app developers
