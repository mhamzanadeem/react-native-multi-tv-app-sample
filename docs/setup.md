# Setup and AWS deployment

## Run on Windows and Android TV Emulator

### Prerequisites

- Git, Node.js 22 LTS, Corepack/Yarn **4.5.0**, JDK **17**, and Android Studio.
- SDK Manager: Android SDK Platform **36**, Platform-Tools, Emulator, required SDK Build-Tools and an **Android TV API 36 x86_64 system image**.
- API 36 is the development emulator baseline; `compileSdkVersion=36`, `targetSdkVersion=34` and `minSdkVersion=24` are separate build settings, not a claim that every API 24+ TV has been verified.
- Device Manager: create a **TV** virtual device named `Hackathon_TV`, landscape, keyboard/D-pad enabled. Do not select a phone image.
- Enable supported Windows virtualization. Start with the existing 2 GB guest RAM / four-core configuration; diagnose resource or graphics issues before changing it.

### First checkout

```powershell
git clone --branch hackathon https://github.com/mhamzanadeem/react-native-multi-tv-app-sample.git
cd react-native-multi-tv-app-sample
corepack enable
yarn.cmd install --immutable
```

- Set `JAVA_HOME` to your installed JDK 17 path if Android Studio/Gradle does not already use it.
- Locate the SDK using Android Studio ? SDK Manager. A common location is `%LOCALAPPDATA%\Android\Sdk`.
- Native folders are Git-ignored. If `apps/expo-multi-tv/android` is missing, generate it once with the installed Expo TV plugins:

```powershell
$env:EXPO_TV = '1'
yarn.cmd workspace @multi-tv/expo-multi-tv exec expo prebuild --platform android --no-install
```

- Do not use `--clean` on a native directory containing uncommitted custom edits.
- `tv:start` checks the existing `hackathon` branch, discovers the SDK, selects the TV AVD, waits for Android boot and builds/installs the app. It does not generate a missing native project.

```powershell
yarn.cmd tv:start -CheckOnly
yarn.cmd tv:start
# If your SDK or AVD name differs:
yarn.cmd tv:start -SdkPath 'C:\Users\YOUR_NAME\AppData\Local\Android\Sdk' -AvdName 'YOUR_TV_AVD'
```

- Test Left/Right/Up/Down, OK/Enter and Back; verify the TV launcher responds before diagnosing app focus.
- To regenerate launcher icon/banner resources after the branding change, rerun the non-clean TV prebuild above and rebuild/install the app.
- Optional browser preview: `yarn.cmd dev:web` (port 8082). Browser testing does not certify Fire TV behavior.

### ADB diagnostics without a global PATH change

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb version
& $adb devices -l
# Replace emulator-5554 if your TV has another serial:
& $adb -s emulator-5554 emu avd name
& $adb -s emulator-5554 shell echo SHELL_OK
& $adb -s emulator-5554 shell getprop sys.boot_completed
```

- Expect the correct TV AVD, responsive shell and boot value `1`; `device` alone does not prove boot completion.
- If a diagnostic hangs, stop with Ctrl+C and inspect connectivity before running input commands.
- If the device stays offline, try a controlled ADB restart, then Cold Boot when appropriate. **Wipe Data deletes installed apps/settings/history and is a last resort.**

## Configure your own AWS deployment

- Create or select the resources in your AWS account; no live resource creation happens merely by cloning/building this repository.
- Create `FormFitDemo` in DynamoDB with String keys **`pk` and `sk`**, using on-demand capacity for the prototype.
- Give the Lambda execution role `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:Query` for that exact table plus basic CloudWatch logging.
- Configure Lambda as listed above; set `TABLE_NAME` in the Lambda environment, never AWS credentials in the app.
- Build the Lambda ZIP:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-lambda.ps1
```

- Upload `.validation/formfit-lambda.zip` to Lambda. Attach it to an API Gateway HTTP API using payload format 2.0 and these routes:

| Method | Route |
| --- | --- |
| GET | `/health` |
| POST | `/v1/workouts/generate` |
| POST | `/v1/workouts/sessions` |
| GET | `/v1/workouts/history` |
| GET / PUT | `/v1/users/preferences` |

- Use the `$default` auto-deploy stage; verify API Gateway has permission to invoke Lambda.
- For the web preview, allow the actual preview origin (for example `http://localhost:8082`), required GET/POST/PUT methods and `Content-Type` / `X-Request-Id` headers in HTTP API CORS. Native TV HTTP requests do not depend on browser CORS.

| File / setting | What to change for your account |
| --- | --- |
| `packages/shared-ui/src/services/cloudWorkouts.ts` | Replace `CLOUD_DEMO_URL` with your HTTPS API origin; retain the 10,000 ms client timeout unless deliberately changing the UX |
| Lambda environment | Set `TABLE_NAME` to your table; region comes from the Lambda runtime |
| `infrastructure/lambda/index.mjs` | Change storage partitioning only if deliberately replacing the shared demo design |
| `infrastructure/lambda/handler.ts` | Adjust API behavior/contracts when adding endpoints; keep client and server validation aligned |
| `packages/shared-ui/src/services/backend/contracts.ts` and `validation.ts` | Update endpoint contracts and validation together if the API changes |
| `scripts/build-lambda.ps1` | Usually unchanged; compiles the shared domain and packages the deployment ZIP |
| `apps/expo-multi-tv/android/local.properties` | Local SDK path only; generated/machine-specific and never committed |

- Test your deployment: `GET /health` should report `plannerVersion: "rules-v2"` and `databaseVerified: true`.
- Generate a synthetic plan, complete a session, then confirm the matching plan/session/history items in DynamoDB.
- Disconnect the network and verify the fallback banner and local workout controls.
- Changing an API origin does not require a Lambda redeploy; changing Lambda/shared planner code does. UI-only changes do not require an AWS deployment.
- Full payloads and deployment details: [Lambda guide](lambda-workout-planner.md), [API contract](api-contract-v1.md).

