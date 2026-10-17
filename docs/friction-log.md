# FormFit TV — Amazon Bedrock friction log

## Task attempted

Evaluate Amazon Bedrock text generation for workout personalization during development of FormFit TV.

## Environment

- AWS Region: US East (N. Virginia), `us-east-1`.
- Interface: Amazon Bedrock console, model catalogue, playground and quota page.
- Models explored: Amazon Nova models and AI21 Jamba 1.5 Mini.

## Steps taken

1. Searched the model catalogue for Nova Micro and opened the playground.
2. Submitted a short prompt requesting a three-sentence explanation of a beginner workout.
3. After a throttling error, inspected the quota page. Nova Micro showed zero tokens per minute and requests per minute for the displayed inference options; other Nova models also showed zero quotas.
4. Investigated alternatives. The console displayed nonzero, limited quotas for Jamba 1.5 Mini.
5. An AWS Marketplace agreement for Jamba 1.5 Mini became active, but subsequent invocation attempts still encountered an error. The active agreement did not establish successful model invocation.

## Expected result

An available model could complete a small playground request, or the console would clearly explain which account, model, Region or quota restriction prevented it and what action to take.

## Actual result

The Nova playground displayed `ThrottlingException: Too many tokens per day, please wait before trying again.` The quota page displayed zero TPM/RPM for Nova. Alternative access attempts did not produce a successful inference during this investigation.

The exact account-level cause of the daily-token restriction was not established. This report does not claim an AWS outage or that accepting a Marketplace agreement should increase inference quotas.

## Severity and project impact

**Important — blocked the planned model-backed prototype workflow.** The core application could continue, but the team could not rely on Bedrock for the demonstration.

## Workaround

Implemented deterministic workout planning in AWS Lambda using validated exercise definitions and user preferences. API Gateway and DynamoDB support the deployed workflow. Bedrock is not used by the final workout planner.

## Actionable suggestions

- Explain effective model invocation availability, including account-specific restrictions, before the user submits a playground request.
- Distinguish minute-based quotas from daily-token limits and provide any applicable reset or remediation information.
- Explain clearly that a Marketplace agreement and inference quota availability are separate requirements.
- Where possible, identify an available model/inference option for the current account or link to the appropriate support/quota process.

## Evidence

During development, console screenshots captured the playground throttling error and the zero Nova quotas. They are not included here because the original captures may contain account information. Add redacted screenshots if needed; never publish credentials, account IDs or agreement identifiers.
