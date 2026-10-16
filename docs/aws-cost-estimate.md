# AWS cost estimate and cleanup

Estimate date: **2026-10-14 (Asia/Karachi)**. Region: **us-east-1, N. Virginia**. USD gross list-price model, no credit/Free Tier deductions or tax. No services were provisioned. Mock operations have no AWS usage; unrelated account resources are excluded.

## Official sources and planning rates

| Meter | Assumption and source |
|---|---|
| API Gateway HTTP API | $1/million first-tier calls, from [official pricing](https://aws.amazon.com/api-gateway/pricing/). No REST cache or portals. |
| Lambda | $0.20/million invocations; x86 $0.0000166667/GB-second; 128MB and 100ms average billed duration; [pricing](https://aws.amazon.com/lambda/pricing/). No provisioned concurrency. |
| DynamoDB Standard on-demand | $0.625/million WRUs, $0.125/million RRUs, $0.25/GB-month storage; [pricing](https://aws.amazon.com/dynamodb/pricing/). Assume one <=1KB write and one strongly consistent <=4KB read per call; history pages/indexes/transactions can consume more. |
| CloudWatch | Planning rates $0.50/GB Standard log ingestion, $0.03/GB-month archive; [pricing](https://aws.amazon.com/cloudwatch/pricing/). One KB metadata logs/call. Recheck compression, Region and log class. |
| Internet transfer | Provisional $0.09/GB small US-East egress rate, ignoring allowances, ten KB response/call. Verify destination/rate through [API transfer references](https://aws.amazon.com/api-gateway/pricing/) and Calculator. No media hosting. |

[AWS Pricing Calculator](https://calculator.aws/) was opened, but its interactive estimate UI is unavailable in this runner. **No saved or account-specific Calculator estimate is claimed.** Reproduce the inputs below there before deployment. Rates and account eligibility may change.

## Calculation and comparison

For N requests: API=N/1e6*1; Lambda requests=N/1e6*.20; compute=N*.125*.1*.0000166667; Dynamo writes=N/1e6*.625, reads=N/1e6*.125; logs=N*.000001*.50; egress=N*.00001*.09. Table storage=GB*.25*(retained hours/720); archived logs=GB*.03*(retained hours/720). Decimal GB simplifies estimates; exact metering differs.

| Usage | Modeled gross cost | Planning allowance |
|---|---|---|
| Mock-only | $0 AWS usage from this feature | Existing account resources excluded |
| 50-minute demo: 100 requests, 1MB table removed afterwards | API .00010 + Lambda .000041 + Dynamo requests .000075 + logs .00005 + egress .00009 + storage <.000001 ≈ **$0.00036** | $0.01–$1 pending actual extras |
| Repeated tests: 1,000 requests, 10MB table retained one month | Traffic/compute/requests .00356 + table .0025 + archive .00003 ≈ **$0.0061** | $0.05–$2 |
| Monthly small demo: 10,000 requests, 0.1GB table, .01GB archived logs | .03558 + .025 + .0003 ≈ **$0.061/month** | $0.10–$5 if assumptions hold |

These exclude authentication provider, deployment artifacts, DNS, taxes and optional services. They are estimates, not a cap. An exposed endpoint can receive unexpected traffic. Fifty minutes alone does not bound usage. Idle HTTP API/on-demand Lambda have no request/compute usage, but retained tables/logs/backups/artifacts can cost money.

## Optional Bedrock

Default: zero calls. [Official pricing](https://aws.amazon.com/bedrock/pricing/) varies by model, Region and tier. Published US-East Standard DeepSeek v3.2 text-rate illustration: $0.62/million input and $1.85/million output tokens. Ten calls of 1,000 input/500 output tokens: 10*(1000*.62/1e6+500*1.85/1e6) = **$0.01545**. Verify availability/access and rates; this is not a model recommendation or actual integration. No invocation was made. Provisioned throughput, knowledge bases/vector storage, custom models and optional guardrails need separate estimates.

## Reproduce in Calculator

Create estimate → us-east-1 → HTTP API (N monthly calls), Lambda (128MB x86,100ms,N,no provisioned concurrency), DynamoDB Standard on-demand (N one-KB writes/N strongly consistent four-KB reads and retained GB), CloudWatch logs and transfer. Enter total demo usage once; model storage hours or conservatively a month if the UI cannot express partial retention. Add any actual deployment S3, identity or DNS resources. Save/export the estimate yourself and record its rate/date. Calculator estimates do not establish account credits, taxes or actual billing.

## Budget controls

Review [Free Tier](https://aws.amazon.com/free/) and your Billing credits: new-customer plans advertise up to $200 and a free plan up to six months; age, plan, eligibility and expiration differ. These estimates subtract nothing.

Before deployment: Billing → [Budgets](https://aws.amazon.com/aws-cost-management/aws-budgets/) → Create budget → monthly cost budget, for example **$5** account-wide. Add actual alerts at $1/$3/$5 (20/60/100%) and a forecast alert, with a monitored email; confirm subscribers. Review optional budget-action pricing before enabling automation. Notifications can be delayed and **are not a hard spending cap**. See [AWS guidance](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html).

Bound API stage/route throttles, Lambda concurrency/timeouts, query size and manual request count. Avoid automatic retries/polling and Bedrock by default. Avoid NAT, VPC endpoints, DAX, global tables, provisioned capacities, API caching, detailed payload logs, optional backups/PITR/tracing and extra metrics unless separately justified. Set short explicit log retention. Review Billing/Cost Explorer after the demo and after refresh; limits reduce risk, not guarantee a bill ceiling.

## Future teardown checklist

No destructive script is supplied. Prefer a reviewed dedicated SAM/CloudFormation stack with Region/account, resource inventory, tags and explicit retention. No template here pretends handlers are deployed.

1. Restore client mock mode/rebuild and stop requests. List exact API ID/stage, Lambda functions/versions/aliases, table ARN, log group names, deployment objects and optional resources from stack outputs. Verify account and Region.
2. Review deletion/retention policies and consent for any data export. Obtain explicit approval for this exact inventory. A future teardown script must print IDs and require typed confirmation; never delete by broad prefix.
3. Delete only the approved dedicated stack; inspect completion/events. Review retained resources individually. Shared infrastructure stays untouched. Remove triggers/request sources and any provisioned concurrency.
4. Verify API/stage/routes and Lambda removal. Stopping Metro alone does not stop other callers. Incurred request/compute costs remain payable.
5. Verify DynamoDB table deletion; separately review retained backups/PITR/export objects/global replicas. Retained data costs can persist. TTL is asynchronous, not immediate teardown.
6. Verify approved Lambda/API log-group deletion or intended retention; logs can outlive stack removal. Remove optional approved alarms/dashboards. Ingestion already charged is not refunded.
7. Bedrock on-demand stops when callers stop. If later created, separately review provisioned throughput, imported/custom models, knowledge bases/vector stores and their S3 data/roles. None is created or required here.
8. Review deployment S3 artifacts, optional identity resources/secrets/domains/Route53/network resources added later. Delete only approved demo IDs, not shared buckets/users/roles.
9. Recheck inventory and Billing/Cost Explorer after refresh and next day. Keep alerts until billing settles. Teardown stops future applicable usage, not past charges.
