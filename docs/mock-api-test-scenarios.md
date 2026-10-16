# Mock API manual test scenarios

Run `yarn.cmd tv:start` in a normal terminal, or `yarn.cmd dev:web`. Open Menu ? **AWS demo lab**. Confirm **MOCK MODE ? NO AWS REQUESTS**. Use D-pad/Select or the existing web keyboard controls; scroll through focusable JSON cards. No network or credentials are needed.

Select a scenario, inspect inputs and outgoing JSON, then Send Mock Request. Expect about 450ms loading, followed by SUCCESS/ERROR, mode, HTTP status, actual response JSON and exact fixture filename. All fixtures are under `packages/shared-ui/src/data/mock-api/`. Reset clears only lab memory, not personal progress. Sample history is explicitly labelled.

## Compact matrix

| Selector | Fixture | Expected status | Exact request/response |
|---|---|---|---|
| Beginner / 20 min | generate-workout-success.json | 200 / SUCCESS | [beginner.json](api-examples/beginner.json) |
| Strength / dumbbells | generate-workout-success.json | 200 / SUCCESS | [strength.json](api-examples/strength.json) |
| Low-impact cardio | generate-workout-success.json | 200 / SUCCESS | [cardio.json](api-examples/cardio.json) |
| Invalid duration | generate-workout-invalid-input.json | 400 / INVALID_WORKOUT_CONFIGURATION | [invalid.json](api-examples/invalid.json) |
| Unsupported equipment | generate-workout-invalid-input.json | 400 / INVALID_WORKOUT_CONFIGURATION | [unsupported.json](api-examples/unsupported.json) |
| Simulated unavailable plan | generate-workout-no-matching-plan.json | 422 / NO_MATCHING_PLAN | [no-match.json](api-examples/no-match.json) |
| Empty history | workout-history-empty.json | 200 / SUCCESS | [empty.json](api-examples/empty.json) |
| Sample history | workout-history-success.json | 200 / SUCCESS | [history.json](api-examples/history.json) |
| Save sample completion | save-session-success.json | 201 / SUCCESS | [save.json](api-examples/save.json) |
| Simulated save failure | save-session-failure.json | 500 / SERVER_ERROR | [save-failure.json](api-examples/save-failure.json) |
| Read preferences | preferences-success.json | 200 / SUCCESS | [preferences.json](api-examples/preferences.json) |
| Update preferences | preferences-update-success.json | 200 / SUCCESS | [update.json](api-examples/update.json) |
| Simulated server error | server-error.json | 500 / SERVER_ERROR | [server.json](api-examples/server.json) |
| Simulated network failure | network-error.json | 500 / NETWORK_ERROR | [network.json](api-examples/network.json) |
| Simulated timeout | timeout.json | 500 / TIMEOUT | [timeout.json](api-examples/timeout.json) |

## Each scenario: inputs and pass criteria

Captured examples are documentation, not UI fixture sources. Generated createdAt changes at runtime. Every request has correlation demo-001.

### Beginner / 20 min

Select **Beginner / 20 min**; its preset fills these exact inputs (editable choices apply to generation/preferences):

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

Send. Verify mode MOCK, fixture `generate-workout-success.json`, status 200 / SUCCESS, and fields `requestId, status, planId, plan, notes`. Compare full [expected response](api-examples/beginner.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Strength / dumbbells

Select **Strength / dumbbells**; its preset fills these exact inputs (editable choices apply to generation/preferences):

```json
{
  "goal": "strength",
  "fitnessLevel": "intermediate",
  "durationMinutes": 30,
  "equipment": [
    "dumbbells"
  ],
  "lowImpact": true,
  "requestId": "demo-001"
}
```

Send. Verify mode MOCK, fixture `generate-workout-success.json`, status 200 / SUCCESS, and fields `requestId, status, planId, plan, notes`. Compare full [expected response](api-examples/strength.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Low-impact cardio

Select **Low-impact cardio**; its preset fills these exact inputs (editable choices apply to generation/preferences):

```json
{
  "goal": "cardio",
  "fitnessLevel": "beginner",
  "durationMinutes": 10,
  "equipment": [],
  "lowImpact": true,
  "requestId": "demo-001"
}
```

Send. Verify mode MOCK, fixture `generate-workout-success.json`, status 200 / SUCCESS, and fields `requestId, status, planId, plan, notes`. Compare full [expected response](api-examples/cardio.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Invalid duration

Select **Invalid duration**; its preset fills these exact inputs (editable choices apply to generation/preferences):

```json
{
  "goal": "general-fitness",
  "fitnessLevel": "beginner",
  "durationMinutes": 0,
  "equipment": [],
  "lowImpact": true,
  "requestId": "demo-001"
}
```

Send. Verify mode MOCK, fixture `generate-workout-invalid-input.json`, status 400 / INVALID_WORKOUT_CONFIGURATION, and fields `requestId, error`. Compare full [expected response](api-examples/invalid.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Unsupported equipment

Select **Unsupported equipment**; its preset fills these exact inputs (editable choices apply to generation/preferences):

```json
{
  "goal": "general-fitness",
  "fitnessLevel": "beginner",
  "durationMinutes": 20,
  "equipment": [
    "treadmill"
  ],
  "lowImpact": true,
  "requestId": "demo-001"
}
```

Send. Verify mode MOCK, fixture `generate-workout-invalid-input.json`, status 400 / INVALID_WORKOUT_CONFIGURATION, and fields `requestId, error`. Compare full [expected response](api-examples/unsupported.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Simulated unavailable plan

Select **Simulated unavailable plan**; its preset fills these exact inputs (editable choices apply to generation/preferences):

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

Send. Verify mode MOCK, fixture `generate-workout-no-matching-plan.json`, status 422 / NO_MATCHING_PLAN, and fields `requestId, error`. Compare full [expected response](api-examples/no-match.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Empty history

Select **Empty history**; its preset fills these exact inputs (editable choices apply to generation/preferences):

```json
{
  "requestId": "demo-001"
}
```

Send. Verify mode MOCK, fixture `workout-history-empty.json`, status 200 / SUCCESS, and fields `requestId, status, sessions, sampleData`. Compare full [expected response](api-examples/empty.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Sample history

Select **Sample history**; its preset fills these exact inputs (editable choices apply to generation/preferences):

```json
{
  "requestId": "demo-001"
}
```

Send. Verify mode MOCK, fixture `workout-history-success.json`, status 200 / SUCCESS, and fields `requestId, status, sessions, sampleData`. Compare full [expected response](api-examples/history.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Save sample completion

Select **Save sample completion**; its preset fills these exact inputs (editable choices apply to generation/preferences):

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

Send. Verify mode MOCK, fixture `save-session-success.json`, status 201 / SUCCESS, and fields `requestId, status, sessionId, summary`. Compare full [expected response](api-examples/save.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Simulated save failure

Select **Simulated save failure**; its preset fills these exact inputs (editable choices apply to generation/preferences):

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

Send. Verify mode MOCK, fixture `save-session-failure.json`, status 500 / SERVER_ERROR, and fields `requestId, error`. Compare full [expected response](api-examples/save-failure.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Read preferences

Select **Read preferences**; its preset fills these exact inputs (editable choices apply to generation/preferences):

```json
{
  "requestId": "demo-001"
}
```

Send. Verify mode MOCK, fixture `preferences-success.json`, status 200 / SUCCESS, and fields `requestId, status, preferences`. Compare full [expected response](api-examples/preferences.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Update preferences

Select **Update preferences**; its preset fills these exact inputs (editable choices apply to generation/preferences):

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

Send. Verify mode MOCK, fixture `preferences-update-success.json`, status 200 / SUCCESS, and fields `requestId, status, preferences`. Compare full [expected response](api-examples/update.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Simulated server error

Select **Simulated server error**; its preset fills these exact inputs (editable choices apply to generation/preferences):

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

Send. Verify mode MOCK, fixture `server-error.json`, status 500 / SERVER_ERROR, and fields `requestId, error`. Compare full [expected response](api-examples/server.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Simulated network failure

Select **Simulated network failure**; its preset fills these exact inputs (editable choices apply to generation/preferences):

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

Send. Verify mode MOCK, fixture `network-error.json`, status 500 / NETWORK_ERROR, and fields `requestId, error`. Compare full [expected response](api-examples/network.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

### Simulated timeout

Select **Simulated timeout**; its preset fills these exact inputs (editable choices apply to generation/preferences):

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

Send. Verify mode MOCK, fixture `timeout.json`, status 500 / TIMEOUT, and fields `requestId, error`. Compare full [expected response](api-examples/timeout.json). For generated plans, check config, target duration, eligible equipment/level/impact and actual exercises. For empty history, check sessions []; sample history must show sampleData true. Saves must echo submitted facts. Error JSON must match fixture code/message. Pass only if the actual Send result and displayed correlation match.

## Repeated requests and recovery

1. Reset, select Beginner / 20 min, Send: plan config is general-fitness/beginner/20/[]/true.
2. In that same scenario change Strength, intermediate, 30 and Dumbbells. Outgoing JSON changes immediately and stale result clears. Send: plan goal/config/timing/exercises change; source remains generate-workout-success.json.
3. Invalid: 0 minutes in the normal successful scenario gives 400. Correct duration and retry there succeeds. Deliberately selecting Invalid duration keeps its forced error fixture even after correcting values; choose Beginner to return to normal resolution.
4. Malformed request changes correlation to an invalid ID and yields 400 with requestId invalid-request. Reset restores valid input. Validation precedes simulated server/network errors.
5. Save sample completion twice: 201 then 200. Empty history now contains one demo-memory session. Reset then Empty history returns []. Sample history seeds its labelled record independently.
6. Update preferences using different choices, Send; Read preferences returns those values until Reset/unmount.
7. In future AWS mode, fixtures do not force errors. Use genuine invalid requests or an authorized test handler to obtain errors; verify REAL HTTPS banner and fixture None. Never present a mock failure label as proof of real server behavior.

Run `yarn.cmd workspace @multi-tv/expo-multi-tv run test --watchAll=false --runInBand mockWorkoutBackend mockAwsScreen`, then the full README suite. Transport tests use stubs, not live endpoints. Component checks do not certify physical remote navigation; perform this matrix on the emulator before recording.
