# 50-minute FormFit API demo runbook

Prerequisites: account, budget controls, permissions, deployed compatible endpoint, test identity/data and emulator must already work. This schedule does not guarantee deployment in 50 minutes. No cloud resources are deployed by this package.

| Minutes | Action and evidence |
|---|---|
| 0–5 | Check branch/working tree without reverting work; budget/credits/Region; emulator, app journey and recording storage. |
| 5–10 | Set backendConfig mode aws/baseUrl/timeoutMs; rebuild. Verify REAL HTTPS banner, authorized endpoint and web CORS. Fixture must say None. |
| 10–17 | Beginner/20/no gear generation. Show outgoing POST JSON, loading, HTTP200, requestId and actual response plan. |
| 17–23 | Strength/intermediate/30/dumbbells and low-impact cardio/10. Show changed inputs and compatible returned exercises. |
| 23–28 | Invalid duration/malformed request gives genuine validation error; correct inputs and succeed. A simulated server scenario cannot force an AWS error. |
| 28–35 | Complete a local workout; inspect personal Progress. Separately save the clearly labelled sample summary in the lab and retrieve API history; show idempotent retry. Explain automatic cloud sync of personal progress is not implemented. |
| 35–43 | Record problem, TV journey, personalization, API exchange and recovery. Keep MOCK and REAL segments visibly distinct. |
| 43–47 | Play back: readable focus/status/JSON, correct mode, no tokens/account data, actual completion facts. Retake unclear sections. |
| 47–50 | Restore mock/rebuild; stop requests. Start reviewed teardown checklist. Finish cleanup even if it takes longer than three minutes. |

## Offline alternative

Leave mode mock. Run `yarn.cmd tv:start`, or `yarn.cmd dev:web`. Confirm MOCK MODE — NO AWS REQUESTS. Show Beginner, Strength, Cardio, changed outgoing JSON, fixture path and actual simulated response. Demonstrate invalid/server/network/timeout cases, sample save/history, then Reset → empty history. Complete the real local workout separately. Say explicitly: “This is a local simulator of the future AWS contract; no AWS service or model is connected.” Installed SDK/AVD/dependencies are prerequisites; use web honestly if native tooling is unavailable.

Stop Metro with Ctrl+C; close the emulator window. Stopping a client does not remove cloud resources. Follow [cost controls and teardown](aws-cost-estimate.md), and recheck Billing after data refresh. Never record secrets or private history without consent.
