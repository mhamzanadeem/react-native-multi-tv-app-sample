# Guest TV installations

- Each app installation creates a `tv-` ID with 32 hexadecimal characters. The full ID is shown below the app logo.
- Android stores it in the app's documents directory using the existing storage adapter, under `formfit-guest-installation-v1`. Web uses localStorage. This is persistent storage, not disposable cache.
- Relaunching or reloading reuses the ID. Clearing app data/storage removes it; a reinstall may remove it or restore it from a platform backup. It is not a hardware identifier.
- Simultaneous initialization calls share one write. If the stored ID is corrupt or cannot be saved, cloud operations fail rather than using a shared identity. Local exercise still works.
- Every cloud request sends `X-TV-Installation-Id`. Lambda validates the ID and constructs an immutable request-scoped DynamoDB partition: `pk = TV#<installationId>`.
- `PLAN#`, `REQUEST#`, `SESSION#`, `HISTORY#`, and preferences use that partition. Health probes use `SYSTEM#health`.
- The client checks the echoed installation ID before accepting success responses. An older shared backend is rejected.
- Progress automatically refreshes this guest's cloud records when opened, alongside workouts saved locally. One physical TV with multiple people still shares one guest identity.

## Deploy

1. Run `scripts/build-lambda.ps1` from the repository root.
2. Upload `.validation/formfit-lambda.zip` to the existing `formfit-api` Lambda using **Code > Upload from > .zip file**.
3. Keep `index.handler`, the existing table name, region and IAM table permissions. The table's string `pk`/`sk` schema does not change.
4. If using API Gateway CORS for the web preview, add `X-TV-Installation-Id` to allowed headers alongside existing `Content-Type` and `X-Request-Id`. Save. Native Android requests are not governed by browser CORS.
5. Reload the app. `/health` should include `installationIsolation: guest-tv-v1`.
6. Generate a workout and verify DynamoDB contains `TV#` plus the displayed installation ID. A second installation should show a different ID and empty cloud history until it creates workouts.

`scripts/test-workout-api.ps1` uses a fresh diagnostic guest ID by default. Pass `-InstallationId '<ID shown on TV>'` only if intentionally adding synthetic probe workouts to that TV's history.

## Existing data and limits

- Existing local workouts remain on that TV. The `DEMO#shared` cloud partition is preserved but is no longer read by guest requests. Its records cannot be attributed automatically to a TV; there is no implicit claim/import operation.
- This is account-free guest grouping, not authenticated authorization. Someone who obtains another installation ID can impersonate that guest. Do not use this approach for sensitive personal data or describe it as secure user isolation.
- Cross-TV identity, separate household profiles, authenticated ownership and backup-aware reinstall identity require a later account/pairing design.
