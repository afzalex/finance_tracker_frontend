## @finance-tracker/api@2.0.0

This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition will be automatically resolved via `package.json`. ([Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run `npm publish`

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install @finance-tracker/api@2.0.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to *http://localhost*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AccountsApi* | [**accountTransactionsApiV1AccountsAccountIdTransactionsGet**](docs/AccountsApi.md#accounttransactionsapiv1accountsaccountidtransactionsget) | **GET** /api/v1/accounts/{account_id}/transactions | Account Transactions
*AccountsApi* | [**listAccountsApiV1AccountsGet**](docs/AccountsApi.md#listaccountsapiv1accountsget) | **GET** /api/v1/accounts | List Accounts
*AnalyticsApi* | [**anomalyHighlightsApiV1AnalyticsAnomaliesGet**](docs/AnalyticsApi.md#anomalyhighlightsapiv1analyticsanomaliesget) | **GET** /api/v1/analytics/anomalies | Anomaly Highlights
*AnalyticsApi* | [**cashflowApiV1AnalyticsCashflowGet**](docs/AnalyticsApi.md#cashflowapiv1analyticscashflowget) | **GET** /api/v1/analytics/cashflow | Cashflow
*AnalyticsApi* | [**categoryBreakdownApiV1AnalyticsCategoryBreakdownGet**](docs/AnalyticsApi.md#categorybreakdownapiv1analyticscategorybreakdownget) | **GET** /api/v1/analytics/category-breakdown | Category Breakdown
*AnalyticsApi* | [**recurringTransactionsApiV1AnalyticsRecurringGet**](docs/AnalyticsApi.md#recurringtransactionsapiv1analyticsrecurringget) | **GET** /api/v1/analytics/recurring | Recurring Transactions
*AnalyticsApi* | [**topMerchantsApiV1AnalyticsTopMerchantsGet**](docs/AnalyticsApi.md#topmerchantsapiv1analyticstopmerchantsget) | **GET** /api/v1/analytics/top-merchants | Top Merchants
*FetchedEmailsApi* | [**getFetchedEmailApiV1FetchedEmailsFetchedEmailIdGet**](docs/FetchedEmailsApi.md#getfetchedemailapiv1fetchedemailsfetchedemailidget) | **GET** /api/v1/fetched-emails/{fetched_email_id} | Get Fetched Email
*HealthApi* | [**healthHealthGet**](docs/HealthApi.md#healthhealthget) | **GET** /health | Health
*StatsApi* | [**monthlyStatsApiV1StatsGet**](docs/StatsApi.md#monthlystatsapiv1statsget) | **GET** /api/v1/stats | Monthly Stats
*TransactionsApi* | [**listTransactionsApiV1TransactionsGet**](docs/TransactionsApi.md#listtransactionsapiv1transactionsget) | **GET** /api/v1/transactions | List Transactions


### Documentation For Models

 - [AccountRead](docs/AccountRead.md)
 - [CashflowPoint](docs/CashflowPoint.md)
 - [CategoryBreakdown](docs/CategoryBreakdown.md)
 - [Direction](docs/Direction.md)
 - [FetchedEmailEnrichmentRead](docs/FetchedEmailEnrichmentRead.md)
 - [FetchedEmailRead](docs/FetchedEmailRead.md)
 - [FetchedEmailWithEnrichmentRead](docs/FetchedEmailWithEnrichmentRead.md)
 - [HTTPValidationError](docs/HTTPValidationError.md)
 - [LocationInner](docs/LocationInner.md)
 - [MerchantSummary](docs/MerchantSummary.md)
 - [MonthlyStats](docs/MonthlyStats.md)
 - [TransactionListResponse](docs/TransactionListResponse.md)
 - [TransactionRead](docs/TransactionRead.md)
 - [ValidationError](docs/ValidationError.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization

Endpoints do not require authorization.

