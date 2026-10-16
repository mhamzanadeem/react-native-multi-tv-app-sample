# FormFit rules-based Lambda planner

## What is implemented

The same dependency-free TypeScript planning domain runs on the TV and in Lambda.
Bedrock is not called. Lambda does not understand unrestricted natural language or
invent exercises. Requests use the structured choices exposed in Workout Setup.
Plans use original FormFit instructions, not copied competitor programmes.

The catalogue contains 58 exercise definitions. The original 29 remain the default
balanced catalogue; 29 specialist definitions are opt-in by workout style. This
keeps existing plans and fixtures compatible. These instructions need qualified
fitness-content review before a public release; they are not medical screening.

## Research informing the controls

- [Fitbod gym profiles](https://fitbod.me/blog/your-gym-profile/): equipment, goals,
  experience and duration are distinct inputs.
- [Fitbod exercise customization](https://help.fitbod.me/hc/en-us/sections/31812780318743-Exercise-Workout-Customization): body focus and exercise choices.
- [Fitness Blender library](https://www.fitnessblender.com/videos): training type,
  difficulty and equipment filters.
- [Nike Training Club examples](https://about.nike.com/en/newsroom/releases/nike-launches-new-global-football-inspired-workouts-on-ntc-app-and-netflix): strength, mobility, yoga and interval categories.
- [Apple Fitness+](https://www.apple.com/apple-fitness-plus/): separate workout types,
  including equipment-dependent activities.

These sources informed the information architecture; their videos, instructions,
calorie estimates and claims are not imported or reproduced.

## Supported customization

| Group | Styles |
| --- | --- |
| General | Balanced mix |
| Strength | Bodyweight, dumbbell, resistance band, kettlebell basics, core stability, Pilates-inspired |
| Cardio | Steady cardio, cardio intervals, HIIT-style intervals, shadow boxing, dance cardio, indoor walking, stationary cycling, indoor rowing |
| Movement | Yoga-inspired, supported balance, mobility flow, stretching, seated movement |

Workout Setup > Customize workout style exposes the styles appropriate to the
selected goal, body focus, movement position, rest preference, variation and an
exercise exclusion list. Changing goal resets style but preserves other choices.

- Duration: 5, 10, 15, 20, 30, 45 or 60 minutes; default remains 10.
- Equipment: none, dumbbells, resistance band, mat, stable chair, kettlebell,
  stationary bike and rowing machine. All requirements must be available.
- Body focus: full, upper, lower or core.
- Position: any, standing-only or seated-only; no silent floor substitutions.
- Low impact remains independent of experience and interval style.
- Extra rest adds 15 seconds between sets.
- Variation rotates the matching exercise order; a small matching pool can repeat.
- Excluded exercise IDs must exist and cannot be duplicated.

HIIT-style, kettlebell basics and rowing reject beginner requests with alternatives.
Machine controls, resistance, lifting loads, heart rate and physical form are not
measured or controlled. No claims of calorie burn, injury rehabilitation, pregnancy
suitability, guaranteed outcomes or exhaustive coverage of all workout disciplines
are made. Heavy barbell/olympic lifts, swimming and outdoor navigation are not
supported. Pilates and yoga options are bounded beginner-inspired movements, not
complete instructor-led programmes.

## Planner guarantees and limitations

Every selected exercise must meet goal, level, equipment, impact, position, body
focus, style and exclusion constraints. Conflicts return actionable errors; the
planner never relaxes those constraints to manufacture a result. Unknown options,
free-text fields, malformed JSON, invalid durations and oversized requests fail.

The planner uses complete timed blocks/sets, between-set recovery and 15-second
transitions. It uses shorter unused alternatives near the time limit. Plans must
be no more than 60 seconds over or 180 seconds under the requested duration;
otherwise a no-matching-plan error asks the user to change duration/rest/style.
Reported estimates include rest and transitions. Repetition pacing remains four
seconds per repetition, not measured movement.

The client validates returned exercises and prescriptions against its own matching
catalogue. Keep the TV and Lambda versions aligned when adding exercises.

## Build and deploy to the EXISTING resources

The build creates a ZIP and does not deploy or change AWS resources:

```powershell
cd C:\tvapp
& "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File scripts/build-lambda.ps1
```

Output: `C:\tvapp\.validation\formfit-lambda.zip`.

1. AWS Console, us-east-1 > Lambda > Event Functions/Functions > formfit-api.
2. Code > Upload from > .zip file > Upload. Select the ZIP above and Save.
3. Runtime settings: Node.js 22.x, handler `index.handler`.
4. Configuration > Environment variables: `TABLE_NAME=FormFitDemo`.
5. General configuration: 256 MB, 20-second timeout. No VPC attachment is needed.
6. Execution role: retain CloudWatch logging and allow `dynamodb:GetItem`,
   `dynamodb:PutItem`, `dynamodb:Query` on the exact FormFitDemo table ARN.
   Bedrock permission is not needed.
7. API Gateway > formfit-http-api > Routes > Create. Add each route below,
   attach the existing formfit-api Lambda integration, payload format 2.0.
8. Keep the existing `$default` stage with automatic deployment and the previously
   configured localhost CORS settings. Console-created integrations should add
   API Gateway invoke permission; verify it if you see an integration 500.

| Method | Route |
| --- | --- |
| GET | /health (already exists) |
| POST | /v1/workouts/generate |
| POST | /v1/workouts/sessions |
| GET | /v1/workouts/history |
| GET | /v1/users/preferences |
| PUT | /v1/users/preferences |

The health response must now include `plannerVersion: "rules-v2"` and
`databaseVerified: true`. All private-account concerns remain out of scope: this
is an unauthenticated shared demo, not a secure multi-user backend.

## DynamoDB records

Existing table keys remain `pk` (String) and `sk` (String). No new table/index is
needed. All rows use `pk=DEMO#shared` and a JSON string `payload` attribute.

| sk prefix | Purpose |
| --- | --- |
| HEALTH | Connectivity write/read |
| REQUEST#requestId | Idempotent generation input and resulting plan |
| PLAN#planId | Saved canonical plan |
| SESSION#sessionId | Deduplicated completion facts |
| HISTORY#ISO-timestamp#sessionId | Date-ordered history projection |
| PREFERENCES | Shared demo preferences |

Same request ID with different preferences returns 409. Same completion ID with
different facts returns 409. Save requires an existing plan and matching summary
metadata; facts remain user-reported, not movement-verified. History returns the
latest 200 completions using a descending query and handles DynamoDB page limits.
Interrupted projection writes are repaired by retrying the same request. This is
not a multi-record transaction; an interrupted save can temporarily be missing
from history until its retry succeeds. Preferences use last-write-wins in this demo.
There is no retention cleanup/outbox worker yet. Plan/request rows grow with use.

## TV test flow

1. Start Workout > goal Cardio > Customize workout style.
2. Choose Cardio intervals, Standing only, Extra rest and Change exercise order.
3. Use On this TV first; generate/review and verify timing and constraints.
4. Select AWS Lambda demo explicitly. The disclosure explains shared cloud data.
5. Generate a plan. Review must show Built by AWS Lambda.
6. Complete it. A local copy saves first, then the AWS completion uploads.
7. Progress > Refresh AWS demo history displays remote records separately from
   local history, without importing other demo participants' records locally.

Cloud generation failures retain choices and require an explicit retry or switch
to On this TV. There is no silent mock fallback. Failed cloud completion writes
can be retried from the live session's save-error control; automatic retry across
app restarts is not implemented. In-progress timers remain local and are not
restored after app restart. No AWS request is needed for timer progression.

The public endpoint is configured in `services/cloudWorkouts.ts` from the console
URL supplied in the conversation. Deploying the ZIP and adding routes are required
before the AWS choice works; building the app alone does not deploy Lambda.

## Validation

Tests cover 4,320 style/level/impact/position/body-focus/duration combinations,
malformed and impossible requests, exclusions, timing integrity, concurrent
idempotent generation, conditional completion saves, preferences, sanitized
storage errors and the actual screen-to-HTTP-to-handler journey using a substituted
in-memory store. Those tests do not certify live AWS IAM, DynamoDB or TV hardware.


## Current TV planner behavior

The TV planner now calls AWS by default; the source chooser has been removed. A request has a 10-second deadline. Network failures, throttling, service errors or an unusable response trigger local generation with the bundled exercise catalogue and a visible warning. Invalid preferences, authorization failures and no-matching-plan responses remain errors rather than being bypassed. The local fallback is not an AWS-generated cached plan. The warning does not assert a confirmed outage or maintenance. Completion saving remains local first; cloud-generated plans also attempt the cloud save.

The older source-selection walkthrough above describes the previous prototype and is superseded by this section.
