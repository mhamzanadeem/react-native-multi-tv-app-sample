# Future AWS integration guide

No resources were created. This lab works offline; the standard workout journey still uses local generation and persistence. Changing lab mode does not silently move personal history to the cloud.

## Target request path

FormFit TV ? HTTPS API Gateway HTTP API ? Lambda validation/authorization/domain logic ? DynamoDB ? Lambda JSON ? FormFit TV. [AWS documents this integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-dynamo-db.html). Bedrock is optional inside Lambda behind a recommendation interface; initial deterministic generation needs no model. Validate proposed exercise IDs against the catalogue and timing/equipment constraints on server and client.

## Actual integration points

All source paths below are under packages/shared-ui/src.

| File | Symbol | Integration responsibility |
|---|---|---|
| services/backend/config.ts | backendConfig, validateBackendConfig | Set mode to aws, baseUrl to public HTTPS API stage origin/path, timeoutMs (100?30000). Rebuild app; invalid config blocks sending, no fallback. |
| services/backend/createBackend.ts | createBackend | Selects MockWorkoutBackend or AwsWorkoutBackend; no HTTP object constructed for mock. |
| services/backend/contracts.ts | WorkoutBackend.request, routes, Requests, Responses | Implement the five exact routes and consistent envelopes. |
| services/backend/AwsWorkoutBackend.ts | request, HttpTransport | HTTP serialization, correlation headers, bounded parsing, timeout, sanitized errors. Add authenticated transport here later, never credentials in UI. |
| services/backend/validation.ts | validRequest, validResponse | Runtime contract, summary and safe canonical-plan checks. |
| services/backend/MockWorkoutBackend.ts | request, reset | Offline fixture resolver and isolated memory. |
| services/backend/fixtures.ts | FixtureRepository, localFixtures | Imported JSON repository; no remote fixture downloads. |
| screens/fitness/MockAwsScreen.tsx | send, select, change | Lab input state and backend calls; no direct fixture access. |
| hooks/FormFitContext.tsx | FormFitProvider | Future explicit integration of normal planning/save sync, separate from lab. Preserve local guest flow. |
| services/workoutPlanner.ts | validatePlan, WorkoutPlanGenerator | Map backend plan then validate before exposing it to session. |
| data/workoutRepositories.ts | PreferencesRepository, WorkoutHistoryRepository | Retain offline cache and add a retryable sync outbox in a future task. |
| domain/workoutSession.ts | summarizeSession | Source of actual completion facts; no fabricated data. |

Set public config explicitly:

```ts
export const backendConfig: BackendConfig = {
  mode: 'aws',
  baseUrl: 'https://YOUR_API.execute-api.YOUR_REGION.amazonaws.com/YOUR_STAGE',
  timeoutMs: 8000,
};
```

This placeholder is not an endpoint to use. Confirm your deployed stage URL; routes append /v1/... once. Mock-only recovery: set mode mock and rebuild, verify the visible MOCK banner. Nothing automatically switches. Mode aws with a missing/invalid URL displays CONFIGURATION BLOCKED; with unreachable URL returns AWS-labelled network error. Send means a real call. Do not present scenario-labelled simulated failure as a real server failure in AWS mode.

## Endpoint implementation checklist

Use [the versioned contract](api-contract-v1.md) for exact requests, complete successful examples, required/optional fields, failures and fixture paths. The [scenario guide](mock-api-test-scenarios.md) links every captured example.

| Route | Lambda responsibility |
|---|---|
| POST /v1/workouts/generate | Validate config; generate using versioned catalogue; return canonical WorkoutPlan/notes and requestId. Persist plan ownership/metadata if required by session validation. |
| GET /v1/workouts/history | Derive user from authorized identity; query latest 200 sessions; sampleData false for real records. Add pagination in a future contract version. |
| POST /v1/workouts/sessions | Validate completed summary, timestamps/counts, plan ownership; conditional idempotent write by session ID; return normalized summary. Same summary retry 200, changed payload 409. |
| GET /v1/users/preferences | Authorized identity's settings; explicit validated defaults if unset. |
| PUT /v1/users/preferences | Validate and persist settings for authorized identity; return exact accepted preferences. |

Lambda returns errors with requestId and documented code. GET reads requestId from header. CORS for web: allow only intended app origins, GET/POST/PUT/OPTIONS and Content-Type, X-Request-Id plus Authorization when implemented. Do not enable arbitrary credentialed origins. Native TV is not protected by browser CORS; authorization is still required. HTTPS alone is not authorization. Limit request/body sizes and use bounded queries, no table scans for history.

## Plausible DynamoDB keys (future design)

One on-demand table: PK USER#{verified subject}, SK PREFS#v1 for settings; SK SESSION#{completion ISO}#{sessionId} for chronological summaries. Stable ID retry index/idempotency item SK SESSIONID#{sessionId} can point at the chronological record. Use a transaction or consistent conditional-write strategy so retry checks and history cannot disagree. Optional plan record SK PLAN#{planId}, with expiring TTL if retained. Choose retention/consent before deployment; TTL deletion is asynchronous. No shared hardcoded demo user in production.

## Identity and security

No authentication is implemented now. Later use an identity provider, e.g. Cognito with an appropriate TV device-pairing/user login flow reviewed against its supported APIs. API Gateway JWT authorization verifies token issuer/audience; Lambda uses verified subject/claims to authorize each operation. Never trust a client-supplied user ID as ownership proof. Add short-lived user-token transport/storage and refresh separately; do not embed static bearer tokens, IAM access keys or AWS session secrets. Backend-only secrets/Bedrock permission belong in server IAM and secret management. Public baseUrl is not a secret. No user or token payload logging; log requestId, status and latency with short retention. This HTTP adapter logs nothing.

Deployment is a later task. Prefer reviewed SAM/CloudFormation with a dedicated stack, tags, least-privilege Lambda table access, explicit log retention and outputs. No template here pretends to deploy handlers that do not exist. See cost/cleanup guide before provisioning.
