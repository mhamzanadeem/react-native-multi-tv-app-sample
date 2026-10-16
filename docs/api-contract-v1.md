# FormFit API contract v1

This is a locally implemented simulation and future HTTPS contract, not a deployed API. Default mode is `mock`. JSON uses the existing domain's **hyphenated** goals (`general-fitness`), and `equipment: []` means no equipment. `none` and `general_fitness` are not accepted aliases.

`services/backend/contracts.ts` is the typed contract; `validation.ts` validates unknown requests and responses. All successes have `requestId` and `status: "success"`; errors have `requestId` and `error: {code,message}`. Mode, fixture filename and HTTP status are client-side result metadata, never trusted server claims. Network/timeout failures have HTTP status `null`.

## Common rules

Correlation IDs are 1?80 ASCII letters, digits, underscores or hyphens. Send `X-Request-Id` on every real request; POST/PUT also include requestId in JSON. GET has **no body**; the lab's request JSON shows its correlation context. Server must echo the exact ID. Invalid IDs use the local error correlation `invalid-request`.

Configuration: supported goals are general-fitness, strength, cardio, mobility, flexibility and retained legacy weight-management/endurance. Levels: beginner/intermediate/advanced. Durations: 10,15,20,30,45 minutes. Equipment: unique subset of dumbbells, resistance-band, exercise-mat, chair. lowImpact is optional boolean (false when omitted). Other required config fields must be present.

Plans use existing `WorkoutPlan`: targetDurationMinutes and estimatedDurationSeconds, **not** rounded minutes. `plan.exercises[]` is PlannedExercise: canonical exercise metadata plus sets, optional reps/durationSeconds, restSeconds and estimatedSeconds. Exercise metadata carries stable ID, name, description, techniqueCues, equipment, level, goals and modifications. Inter-exercise transition is 15 seconds; estimates include inter-set rest. Runtime validation rejects unknown/altered catalogue entries, unavailable gear, unsuitable intensity/impact, early duplicates and duration mismatch before session use. Catalogue v1 is currently shared source, not negotiated over HTTP; version negotiation is future work.

WorkoutSummary records id, planId, title, goal, fitnessLevel, exerciseCount, completedExercises, skippedExercises, activeSeconds, startedAt and completedAt. Counts are nonnegative integers; completed+skipped equals positive exerciseCount. Timestamps must parse in chronological order. Save additionally requires activeSeconds <= wall-clock duration. These are user-reported workout facts, never verified health measurements. No calorie/medical fields exist.

Status mapping: 200 generate/history/preferences/update; 201 first session save; 200 same-summary retry; 409 conflicting session ID; 400 invalid fields; 401 missing/invalid authentication; 403 unauthorized ownership; 404 unknown route/record; 422 no matching plan; 429 throttled; 5xx backend failure. Transport failures and malformed success responses are local NETWORK_ERROR/TIMEOUT/INVALID_RESPONSE. AWS error bodies are sanitized and mapped from HTTP status; arbitrary server debug text is never displayed. The mock error messages come from JSON fixtures.

## POST /v1/workouts/generate

Operation: `generate`. Consumer: `MockAwsScreen.send` ? `WorkoutBackend.request` ? result display. Fixture: `packages/shared-ui/src/data/mock-api/generate-workout-success.json`.

Request JSON:

```json
{
  "goal": "general-fitness",
  "fitnessLevel": "beginner",
  "durationMinutes": 20,
  "equipment": [],
  "lowImpact": true,
  "requestId": "demo-001"
}
```

The complete successful response, including all canonical exercises, is in [beginner.json](api-examples/beginner.json). It is a captured example; createdAt changes at runtime. Envelope:

```json
{
  "requestId": "demo-001",
  "status": "success",
  "planId": "mock-demo-001",
  "notes": [
    "Locally simulated plan; no AWS or AI request.",
    "Use controlled movement; stop if uncomfortable."
  ]
}
```

`plan` contains the complete domain plan, not a null template. Read the example file for its exact JSON. All generation fields except lowImpact are required.

Representative failure JSON (same error envelope applies to this endpoint):

```json
{
  "requestId": "demo-001",
  "error": {
    "code": "INVALID_WORKOUT_CONFIGURATION",
    "message": "Use a supported goal, level, duration and equipment selection."
  }
}
```

## GET /v1/workouts/history

Operation: `history`. Consumer: `MockAwsScreen.send` ? `WorkoutBackend.request` ? result display. Fixture: `packages/shared-ui/src/data/mock-api/workout-history-success.json`.

Request context (header only; no GET body):

```json
{
  "requestId": "demo-001"
}
```

Success JSON:

```json
{
  "requestId": "demo-001",
  "status": "success",
  "sessions": [
    {
      "id": "sample-session-001",
      "planId": "sample-plan-001",
      "title": "Sample general fitness workout",
      "goal": "general-fitness",
      "fitnessLevel": "beginner",
      "exerciseCount": 4,
      "completedExercises": 3,
      "skippedExercises": 1,
      "activeSeconds": 480,
      "startedAt": "2026-10-01T10:00:00.000Z",
      "completedAt": "2026-10-01T10:10:00.000Z"
    }
  ],
  "sampleData": true
}
```

Representative failure JSON (same error envelope applies to this endpoint):

```json
{
  "requestId": "demo-001",
  "error": {
    "code": "SERVER_ERROR",
    "message": "Simulated backend failure."
  }
}
```

## POST /v1/workouts/sessions

Operation: `saveSession`. Consumer: `MockAwsScreen.send` ? `WorkoutBackend.request` ? result display. Fixture: `packages/shared-ui/src/data/mock-api/save-session-success.json`.

Request JSON:

```json
{
  "requestId": "demo-001",
  "completionState": "completed",
  "summary": {
    "id": "sample-session-001",
    "planId": "sample-plan-001",
    "title": "Sample general fitness workout",
    "goal": "general-fitness",
    "fitnessLevel": "beginner",
    "exerciseCount": 4,
    "completedExercises": 3,
    "skippedExercises": 1,
    "activeSeconds": 480,
    "startedAt": "2026-10-01T10:00:00.000Z",
    "completedAt": "2026-10-01T10:10:00.000Z"
  }
}
```

Success JSON:

```json
{
  "requestId": "demo-001",
  "status": "success",
  "sessionId": "sample-session-001",
  "summary": {
    "id": "sample-session-001",
    "planId": "sample-plan-001",
    "title": "Sample general fitness workout",
    "goal": "general-fitness",
    "fitnessLevel": "beginner",
    "exerciseCount": 4,
    "completedExercises": 3,
    "skippedExercises": 1,
    "activeSeconds": 480,
    "startedAt": "2026-10-01T10:00:00.000Z",
    "completedAt": "2026-10-01T10:10:00.000Z"
  }
}
```

Representative failure JSON (same error envelope applies to this endpoint):

```json
{
  "requestId": "demo-001",
  "error": {
    "code": "SERVER_ERROR",
    "message": "Simulated save failure; no record was saved."
  }
}
```

## GET /v1/users/preferences

Operation: `getPreferences`. Consumer: `MockAwsScreen.send` ? `WorkoutBackend.request` ? result display. Fixture: `packages/shared-ui/src/data/mock-api/preferences-success.json`.

Request context (header only; no GET body):

```json
{
  "requestId": "demo-001"
}
```

Success JSON:

```json
{
  "requestId": "demo-001",
  "status": "success",
  "preferences": {
    "goal": "general-fitness",
    "fitnessLevel": "beginner",
    "durationMinutes": 20,
    "equipment": [],
    "lowImpact": true
  }
}
```

Representative failure JSON (same error envelope applies to this endpoint):

```json
{
  "requestId": "demo-001",
  "error": {
    "code": "SERVER_ERROR",
    "message": "Simulated backend failure."
  }
}
```

## PUT /v1/users/preferences

Operation: `updatePreferences`. Consumer: `MockAwsScreen.send` ? `WorkoutBackend.request` ? result display. Fixture: `packages/shared-ui/src/data/mock-api/preferences-update-success.json`.

Request JSON:

```json
{
  "requestId": "demo-001",
  "preferences": {
    "goal": "general-fitness",
    "fitnessLevel": "beginner",
    "durationMinutes": 10,
    "equipment": [],
    "lowImpact": true
  }
}
```

Success JSON:

```json
{
  "requestId": "demo-001",
  "status": "success",
  "preferences": {
    "goal": "general-fitness",
    "fitnessLevel": "beginner",
    "durationMinutes": 10,
    "equipment": [],
    "lowImpact": true
  }
}
```

Representative failure JSON (same error envelope applies to this endpoint):

```json
{
  "requestId": "demo-001",
  "error": {
    "code": "INVALID_WORKOUT_CONFIGURATION",
    "message": "Use a supported goal, level, duration and equipment selection."
  }
}
```

## Required operation payloads

History/getPreferences require only requestId. History has at most 200 distinct summaries and sampleData boolean; no pagination exists yet. Session save requires requestId, completionState exactly completed, and all WorkoutSummary fields. Full plan is not submitted; planId refers to a previously generated plan. Future server must verify that ID/catalogue and enforce ownership. Preferences update requires requestId plus preferences using the validated config schema. Preferences get returns that same schema.

## Fixture adaptation rules

Fixtures are response templates. Never send template placeholders to the UI: requestId `derived` is replaced with submitted correlation; generation's `planId: derived` and `plan: null` become a locally generated, validated plan with ID mock-{requestId}; notes and status stay from the JSON. Save's null summary and derived sessionId become the submitted validated facts; first-save/retry status is resolved separately. Update's null preferences become submitted values. Read preferences starts from its fixture, then uses successful in-memory updates. History starts with selected fixture sessions plus successful in-memory saves deduplicated by ID. `sampleData: true` labels seeded history. Error messages/codes stay fixture-defined; invalid input overrides selected scenario before resolution. No-match/server/network/timeout are explicitly selected simulated outcomes, not automatic real failures. Reset clears demo memory, never personal progress.

Mock state lasts until lab unmount or Reset. Fixtures never overwrite personal storage. The normal workout journey remains local; this lab is the migration boundary. AWS mode ignores scenario failure fixtures entirely and calls the operation with submitted inputs. Reusing a requestId gives the same mock planId; use distinct IDs for distinct production operations.

Captured examples in api-examples are documentation only. Screens and backends never import them. Tests validate them against this contract. Safety: stop if movement is uncomfortable, and follow the catalogue's controlled technique cues. No diagnosis or promised fitness outcome is provided.
