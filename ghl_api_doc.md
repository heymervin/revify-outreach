# GoHighLevel API V2 Documentation

> **Source:** [GoHighLevel API Docs GitHub Repository](https://github.com/GoHighLevel/highlevel-api-docs)
> 
> This documentation provides comprehensive reference for integrating with the GoHighLevel platform via the V2 API.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication (OAuth 2.0)](#authentication-oauth-20)
   - [Authorization](#authorization)
   - [Scopes](#scopes)
   - [Rate Limits](#rate-limits)
3. [API Endpoints](#api-endpoints)
   - [OAuth Endpoints](#oauth-endpoints)
   - [Available API Modules](#available-api-modules)
4. [External Authentication](#external-authentication)
5. [External Billing](#external-billing)
6. [Webhook Events](#webhook-events)
   - [Webhook Authentication](#webhook-authentication)
   - [Available Webhook Events](#available-webhook-events)
7. [FAQs](#faqs)

---

## Overview

These APIs use OAuth 2.0 flow for authentication.

### Standard Response Fields

#### TraceId

A traceId represents a unique id for every request and is returned with every response. It is useful in pinpointing the exact request and helps while debugging.

### Base URL

```
https://services.leadconnectorhq.com
```

---

## Authentication (OAuth 2.0)

### Authorization

HighLevel supports the Authorization Code Grant flow with v2 APIs. 

**Video Tutorial:** [Loom Video Walkthrough](https://www.loom.com/share/f32384758de74a4dbb647e0b7962c4ea?sid=0907a66d-a160-4b51-bcd4-c47ebae37fca)

#### Step 1: Register an OAuth App

1. Go to the [Marketplace](https://marketplace.gohighlevel.com)
2. Sign up for a developer account
3. Go to "My Apps," and click on "Create App"
4. Fill up the required details in the form
5. Click on the app to access settings for configuring scopes and generating keys

#### Step 2: Add the App to Your Desired Location

1. Direct the location/agency Admin to the app's Authorization Page URL
2. They select the location to connect
3. They are redirected to the redirect URL with the Authorization Code
4. Use the Authorization Code to get the Access token via the Get Access Token API
5. Use the Access Token to call any API

#### Step 3: Get the App's Authorization Page URL

**Standard Auth URL flow:**
```
https://marketplace.gohighlevel.com/oauth/chooselocation?
response_type=code&
redirect_uri=https://myapp.com/oauth/callback/gohighlevel&
client_id=CLIENT_ID&
scope=conversations/message.readonly conversations/message.write
```

**White-labeled Auth URL flow:**
```
https://marketplace.leadconnectorhq.com/oauth/chooselocation?
response_type=code&
redirect_uri=https://myapp.com/oauth/callback/gohighlevel&
client_id=CLIENT_ID&
scope=conversations/message.readonly conversations/message.write
```

**Note:** For users not logged in, append `&loginWindowOpenMode=self` to open login in the same tab.

**Callback Response:**
```
https://myapp.com/oauth/callback/gohighlevel?code=7676cjcbdc6t76cdcbkjcd09821jknnkj
```

### Token Lifecycle

| Token Type | Validity |
|------------|----------|
| Access Token | 1 day (24 hours) |
| Refresh Token | 1 year (until used) |

### Token Refresh Handling

1. Make a request using the accessToken
2. If expired, refresh using the API
3. Save the new access token and refresh token
4. Retry the request with the new accessToken

---

### Rate Limits

**Burst Limit:** 100 API requests per 10 seconds per app per resource (Location/Company)

**Daily Limit:** 200,000 API requests per day per app per resource

**Response Headers:**
- `X-RateLimit-Limit-Daily`: Your daily limit
- `X-RateLimit-Daily-Remaining`: Remaining requests for the day
- `X-RateLimit-Interval-Milliseconds`: Time interval for burst requests
- `X-RateLimit-Max`: Maximum requests in the time interval
- `X-RateLimit-Remaining`: Remaining requests in current interval

---

### Scopes

Below are the available scopes for API endpoints and webhook events:

| Scope | API Endpoints | Webhook Events | Access Type |
|-------|---------------|----------------|-------------|
| `businesses.readonly` | GET /businesses, GET /businesses/:businessId | | Sub-Account |
| `businesses.write` | POST /businesses, PUT /businesses/:businessId, DELETE /businesses/:businessId | | Sub-Account |
| `calendars.readonly` | GET /calendars/, GET /calendars/:calendarId, GET /calendars/:calendarId/free-slots | | Sub-Account |
| `calendars.write` | POST /calendars/, PUT /calendars/:calendarId, DELETE /calendars/:calendarId | | Sub-Account |
| `calendars/groups.readonly` | GET /calendars/groups | | Sub-Account |
| `calendars/groups.write` | POST /calendars/groups, DELETE /calendars/groups/:groupId, PUT /calendars/groups/:groupId | | Sub-Account |
| `calendars/events.readonly` | GET /calendars/events/appointments/:eventId, GET /calendars/events, GET /calendars/blocked-slots | | Sub-Account |
| `calendars/events.write` | DELETE /calendars/events/:eventId, POST /calendars/events/block-slots, POST /calendars/events/appointments | | Sub-Account |
| `campaigns.readonly` | GET /campaigns/ | CampaignStatusUpdate | Sub-Account |
| `contacts.readonly` | GET /contacts/:contactId, GET /contacts/, GET /contacts/:contactId/tasks, GET /contacts/:contactId/notes | ContactCreate, ContactDelete, ContactDndUpdate, ContactTagUpdate, NoteCreate, NoteDelete, TaskCreate, TaskDelete | Sub-Account |
| `contacts.write` | POST /contacts/, PUT /contacts/:contactId, DELETE /contacts/:contactId, POST /contacts/:contactId/tasks, POST /contacts/:contactId/tags | | Sub-Account |
| `conversations.readonly` | GET /conversations/:conversationsId, GET /conversations/search | ConversationUnreadWebhook | Sub-Account |
| `conversations.write` | POST /conversations/, PUT /conversations/:conversationsId, DELETE /conversations/:conversationsId | | Sub-Account |
| `conversations/message.readonly` | GET conversations/messages/:messageId/locations/:locationId/recording | InboundMessage, OutboundMessage | Sub-Account |
| `conversations/message.write` | POST /conversations/messages, POST /conversations/messages/inbound, POST /conversations/messages/upload | ConversationProviderOutboundMessage | Sub-Account |
| `forms.readonly` | GET /forms/, GET /forms/submissions | | Sub-Account |
| `invoices.readonly` | GET /invoices/, GET /invoices/:invoiceId | | Sub-Account |
| `invoices.write` | POST /invoices, PUT /invoices/:invoiceId, DELETE /invoices/:invoiceId, POST /invoices/:invoiceId/send | | Sub-Account |
| `links.readonly` | GET /links/ | | Sub-Account |
| `links.write` | POST /links/, PUT /links/:linkId, DELETE /links/:linkId | | Sub-Account |
| `locations.readonly` | GET /locations/:locationId, GET /locations/search | LocationCreate, LocationUpdate | Sub-Account, Agency |
| `locations.write` | POST /locations/, PUT /locations/:locationId, DELETE /locations/:locationId | | Agency |
| `locations/customValues.readonly` | GET /locations/:locationId/customValues | | Sub-Account |
| `locations/customValues.write` | POST /locations/:locationId/customValues, PUT /locations/:locationId/customValues/:id | | Sub-Account |
| `locations/customFields.readonly` | GET /locations/:locationId/customFields | | Sub-Account |
| `locations/customFields.write` | POST /locations/:locationId/customFields, PUT /locations/:locationId/customFields/:id | | Sub-Account |
| `locations/tags.readonly` | GET /locations/:locationId/tags | | Sub-Account |
| `locations/tags.write` | POST /locations/:locationId/tags/, PUT /locations/:locationId/tags/:tagId | | Sub-Account |
| `medias.readonly` | GET /medias/files | | Sub-Account |
| `medias.write` | POST /medias/upload-file, DELETE /medias/:fileId | | Sub-Account |
| `opportunities.readonly` | GET /opportunities/search, GET /opportunities/:id, GET /opportunities/pipelines | OpportunityCreate, OpportunityDelete, OpportunityStageUpdate, OpportunityStatusUpdate, OpportunityMonetaryValueUpdate | Sub-Account |
| `opportunities.write` | DELETE /opportunities/:id, PUT /opportunities/:id/status, POST /opportunities, PUT /opportunities/:id | | Sub-Account |
| `payments/orders.readonly` | GET /payments/orders/, GET /payments/orders/:orderId | | Sub-Account |
| `payments/orders.write` | POST /payments/orders/:orderId/fulfillments | | Sub-Account |
| `payments/transactions.readonly` | GET /payments/transactions/, GET /payments/transactions/:transactionId | | Sub-Account |
| `payments/subscriptions.readonly` | GET /payments/subscriptions/, GET /payments/subscriptions/:subscriptionId | | Sub-Account |
| `products.readonly` | GET /products/, GET /products/:productId | | Sub-Account |
| `products.write` | POST /products/, PUT /products/:productId, DELETE /products/:productId | | Sub-Account |
| `products/prices.readonly` | GET /products/:productId/price/ | | Sub-Account |
| `products/prices.write` | POST /products/:productId/price/, PUT /products/:productId/price/:priceId | | Sub-Account |
| `oauth.readonly` | GET /oauth/installedLocations | | Agency |
| `oauth.write` | POST /oauth/locationToken | | Agency |
| `saas/location.write` | PUT /update-saas-subscription/:locationId, POST /enable-saas/:locationId | | Agency |
| `snapshots.readonly` | GET /snapshots | | Agency |
| `socialplanner/account.readonly` | GET /social-media-posting/:locationId/accounts | | Sub-Account |
| `socialplanner/post.readonly` | GET /social-media-posting/:locationId/posts/:id | | Sub-Account |
| `socialplanner/post.write` | POST /social-media-posting/:locationId/posts, PUT /social-media-posting/:locationId/posts/:id | | Sub-Account |
| `surveys.readonly` | GET /surveys/, GET /surveys/submissions | | Sub-Account |
| `users.readonly` | GET /users/, GET /users/:userId | | Sub-Account, Agency |
| `users.write` | POST /users/, DELETE /users/:userId, PUT /users/:userId | | Sub-Account, Agency |
| `workflows.readonly` | GET /workflows/ | | Sub-Account |
| `courses.write` | POST courses/courses-exporter/public/import | | Sub-Account |
| `emails/builder.readonly` | GET emails/builder | | Sub-Account |
| `emails/builder.write` | POST emails/builder | | Sub-Account |
| `blogs/post.write` | POST /blogs/posts | | Sub-Account |
| `blogs/posts.readonly` | GET /blogs/posts/all | | Sub-Account |
| `objects/schema.readonly` | GET /objects/:key, GET /objects | | Sub-Account |
| `objects/record.readonly` | GET /objects/:schemaKey/records/:id | | Sub-Account |
| `objects/record.write` | POST /objects/:schemaKey/records, PUT /objects/:schemaKey/records/:id, DELETE /objects/:schemaKey/records/:id | | Sub-Account |

---

## API Endpoints

### OAuth Endpoints

#### Get Access Token

**POST** `/oauth/token`

Use Access Tokens to access GoHighLevel resources on behalf of an authenticated location/company.

**Request Body (application/x-www-form-urlencoded):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_id` | string | Yes | The ID provided by GHL for your integration |
| `client_secret` | string | Yes | Your client secret |
| `grant_type` | string | Yes | `authorization_code`, `refresh_token`, or `client_credentials` |
| `code` | string | No | Authorization code (for initial token) |
| `refresh_token` | string | No | Refresh token (for token refresh) |
| `user_type` | string | No | `Company` or `Location` |
| `redirect_uri` | string | No | Your application's redirect URI |

**Response:**
```json
{
  "access_token": "ab12dc0ae1234a7898f9ff06d4f69gh",
  "token_type": "Bearer",
  "expires_in": 86399,
  "refresh_token": "xy34dc0ae1234a4858f9ff06d4f66ba",
  "scope": "conversations/message.readonly conversations/message.write",
  "userType": "Location",
  "locationId": "l1C08ntBrFjLS0elLIYU",
  "companyId": "l1C08ntBrFjLS0elLIYU",
  "userId": "l1C08ntBrFjLS0elLIYU"
}
```

---

#### Get Location Access Token from Agency Token

**POST** `/oauth/locationToken`

**Required Scope:** `oauth.write`

**Headers:**
- `Version`: `2021-07-28`
- `Authorization`: Bearer {agency_access_token}

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `companyId` | string | Yes | Company ID |
| `locationId` | string | Yes | Location ID for which you want the token |

**Response:**
```json
{
  "access_token": "ab12dc0ae1234a7898f9ff06d4f69gh",
  "token_type": "Bearer",
  "expires_in": 86399,
  "scope": "conversations/message.readonly conversations/message.write",
  "locationId": "l1C08ntBrFjLS0elLIYU",
  "userId": "l1C08ntBrFjLS0elLIYU"
}
```

---

#### Get Installed Locations

**GET** `/oauth/installedLocations`

**Required Scope:** `oauth.readonly`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `companyId` | string | Yes | Company ID |
| `appId` | string | Yes | App ID |
| `skip` | string | No | Number of results to skip (default: 0) |
| `limit` | string | No | Number of results to return (default: 20) |
| `query` | string | No | Search by location name |
| `isInstalled` | boolean | No | Filter by installation status |
| `versionId` | string | No | Version ID of the app |
| `onTrial` | boolean | No | Filter by trial status |
| `planId` | string | No | Filter by plan ID |

**Response:**
```json
{
  "locations": [
    {
      "_id": "0IHuJvc2ofPAAA8GzTRi",
      "name": "John Deo",
      "address": "47 W 13th St, New York, NY 10011, USA",
      "isInstalled": true
    }
  ],
  "count": 1231,
  "installToFutureLocations": true
}
```

---

### Available API Modules

The following API modules are available with OpenAPI specifications:

| Module | Description |
|--------|-------------|
| **Agencies** | Agency-level operations |
| **Associations** | Object associations and relationships |
| **Blogs** | Blog posts management |
| **Businesses** | Business entity management |
| **Calendars** | Calendar and appointment scheduling |
| **Campaigns** | Marketing campaign management |
| **Companies** | Company management |
| **Contacts** | Contact management and CRM |
| **Conversations** | Messaging and conversations |
| **Courses** | Online courses management |
| **Custom Fields** | Custom field definitions |
| **Custom Menus** | Custom menu configurations |
| **Emails** | Email builder and templates |
| **Email ISV** | LC Email integration |
| **Forms** | Form builder and submissions |
| **Funnels** | Sales funnel management |
| **Invoices** | Invoice management |
| **Links** | Trigger links |
| **Locations** | Sub-account management |
| **Marketplace** | Marketplace integrations |
| **Media** | Media library management |
| **Objects** | Custom objects |
| **Opportunities** | Pipeline and deals |
| **Payments** | Payment processing |
| **Phone System** | Phone/calling features |
| **Products** | Product catalog |
| **Proposals** | Proposal management |
| **SaaS API** | SaaS management |
| **Snapshots** | Account snapshots |
| **Social Media Posting** | Social planner |
| **Store** | E-commerce store |
| **Surveys** | Survey management |
| **Users** | User management |
| **Voice AI** | Voice AI features |
| **Workflows** | Workflow automation |

---

## External Authentication

External authentication enables developers to authenticate HighLevel users using their credentials with the developer's system before installing the application.

### Supported Authentication Types

1. **OAuth 2.0** (Authorization Code grant)
2. **API Key / Basic Auth**

### OAuth 2.0 Configuration

#### Configuration Steps

1. **App Details and Scopes:** Provide third-party app name, client key, client secret, and required scopes
2. **Redirect URL:** Copy the redirect URL to your third-party app configuration
3. **Authorization URL Configuration:** Configure according to third-party documentation
4. **Access & Refresh Token Request:** Configure token request settings
5. **Auto Refresh Token:** Enable automatic token refresh
6. **Test API:** Configure a test endpoint to validate tokens

#### OAuth Parameters

| Parameter | System Value | Description |
|-----------|--------------|-------------|
| `client_id` | `{{externalApp.clientId}}` | Unique identifier from third-party app |
| `client_secret` | `{{externalApp.clientSecret}}` | Secret key for authentication |
| `scope` | `{{externalApp.scope}}` | Space-separated permission list |
| `response_type` | `code` | GHL only supports code response type |
| `state` | `{{bundle.state}}` | Security token for CSRF prevention |
| `redirect_uri` | `{{bundle.redirectUrl}}` | Callback URL for authorization response |
| `grant_type` | `authorization_code` or `refresh_token` | Grant type being requested |

#### Token Parameters

| Parameter | System Value | Description |
|-----------|--------------|-------------|
| `code` | `{{bundle.code}}` | Authorization code from callback |
| `access_token` | `{{bundle.accessToken}}` | Token for API authentication |
| `refresh_token` | `{{bundle.refreshToken}}` | Token for obtaining new access tokens |

### API Key / Basic Auth Configuration

#### Section 1: Configure Fields

| Property | Description |
|----------|-------------|
| Label | Helpful text describing the field |
| Key | Key that holds the user's input value |
| Type | Input type (`text` or `password`) |
| Required | Whether field is required |
| Help Text | Brief description for the user |
| Default Field | Default value if field is empty |

**Note:** Maximum of 3 fields supported.

#### Section 2: Configure Authentication Endpoint

| Property | Description |
|----------|-------------|
| Type of Request | GET, POST, PUT, or PATCH |
| URL | Authentication endpoint URL |
| URL Params | Query parameters |
| HTTP Headers | Request headers |
| Request Body | POST/PUT/PATCH body |

Access user input with `{{userData.key}}` (e.g., `{{userData.apiKey}}`).

#### External Auth Request Parameters

| Key | Type | Description |
|-----|------|-------------|
| `companyId` | string | Agency ID (null for location installs) |
| `{field_key}` | string | User input values |
| `approveAllLocations` | boolean | Whether all locations were selected |
| `locationId` | string[] | Array of selected location IDs |
| `excludedLocations` | string[] | Array of excluded location IDs |

---

## External Billing

External billing webhook is essential for externally billed apps in the marketplace.

### Prerequisites

1. App with Business Model marked as Paid
2. External Billing enabled
3. Billing URL configured

### Billing URL Parameters

| Parameter | Values | Notes |
|-----------|--------|-------|
| `clientId` | `<client_id>` | For validation |
| `installType` | `location`, `agency` | Can be `agency,location` for both |
| `locationId` | `<location_id>` | For location or agency+location installs |
| `companyId` | `<agency_id>` | For agency or agency+location installs |

### Billing Webhook

**Endpoint:** `https://services.leadconnectorhq.com/oauth/billing/webhook`

**Method:** POST

**Headers:**

| Header | Value |
|--------|-------|
| `x-ghl-client-key` | Your client key |
| `x-ghl-client-secret` | Your client secret |
| `Content-Type` | application/json |

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `clientId` | string | Your client ID |
| `authType` | enum | `company` or `location` |
| `locationId` | string | Required when authType is `location` |
| `companyId` | string | Required when authType is `company` |
| `subscriptionId` | string | Your subscription ID |
| `paymentId` | string | Your payment ID |
| `amount` | number | Billed amount (required) |
| `status` | enum | `COMPLETED` or `FAILED` |
| `paymentType` | enum | `one_time` or `recurring` |

**Example:**
```bash
curl --location 'https://services.leadconnectorhq.com/oauth/billing/webhook' \
--header 'x-ghl-client-key: <client_key>' \
--header 'x-ghl-client-secret: <client_secret>' \
--header 'Content-Type: application/json' \
--data '{
    "clientId": "<client_id>",
    "authType": "location",
    "locationId": "<location_id>",
    "subscriptionId": "<subscription_id>",
    "paymentId": "<payment_id>",
    "amount": 12,
    "status": "COMPLETED",
    "paymentType": "recurring"
}'
```

---

## Webhook Events

### Webhook Authentication

#### Receiving Webhooks

Webhook requests include:
- **Header:** `x-wh-signature` - Digital signature of the payload
- **Body:** Payload containing timestamp, webhookId, and event data

**Example Payload:**
```json
{
  "timestamp": "2025-01-28T14:35:00Z",
  "webhookId": "abc123xyz",
  "type": "ContactCreate",
  ...
}
```

#### Verifying Signatures

Use the public key to verify the `x-wh-signature`:

```
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAokvo/r9tVgcfZ5DysOSC
Frm602qYV0MaAiNnX9O8KxMbiyRKWeL9JpCpVpt4XHIcBOK4u3cLSqJGOLaPuXw6
dO0t6Q/ZVdAV5Phz+ZtzPL16iCGeK9po6D6JHBpbi989mmzMryUnQJezlYJ3DVfB
csedpinheNnyYeFXolrJvcsjDtfAeRx5ByHQmTnSdFUzuAnC9/GepgLT9SM4nCpv
uxmZMxrJt5Rw+VUaQ9B8JSvbMPpez4peKaJPZHBbU3OdeCVx5klVXXZQGNHOs8gF
3kvoV5rTnXV0IknLBXlcKKAQLZcY/Q9rG6Ifi9c+5vqlvHPCUJFT5XUGG5RKgOKU
J062fRtN+rLYZUV+BjafxQauvC8wSWeYja63VSUruvmNj8xkx2zE/Juc+yjLjTXp
IocmaiFeAO6fUtNjDeFVkhf5LNb59vECyrHD2SQIrhgXpO4Q3dVNA5rw576PwTzN
h/AMfHKIjE4xQA1SZuYJmNnmVZLIZBlQAF9Ntd03rfadZ+yDiOXCCs9FkHibELhC
HULgCsnuDJHcrGNd5/Ddm5hxGQ0ASitgHeMZ0kcIOwKDOzOU53lDza6/Y09T7sYJ
PQe7z0cvj7aE4B+Ax1ZoZGPzpJlZtGXCsu9aTEGEnKzmsFqwcSSnw3JB31IGKAyk
T1hhTiaCeIY/OwwwNUY2yvcCAwEAAQ==
-----END PUBLIC KEY-----
```

**Node.js Verification Example:**
```javascript
const crypto = require('crypto');

const publicKey = `<public_key_here>`;

function verifySignature(payload, signature) {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(payload);
    verifier.end();
    return verifier.verify(publicKey, signature, 'base64');
}

// Usage
const payload = JSON.stringify(webhookBody);
const signature = request.headers['x-wh-signature'];
const isValid = verifySignature(payload, signature);
```

#### Handling Replay Attacks

- Ensure `timestamp` is within acceptable window (e.g., 5 minutes)
- Reject duplicate `webhookId` values

---

### Available Webhook Events

#### App Events
| Event | Description |
|-------|-------------|
| `AppInstall` | App installed |
| `AppUninstall` | App uninstalled |
| `PlanChange` | Subscription plan changed |
| `ExternalAuthConnected` | External auth connected |

#### Appointment Events
| Event | Description |
|-------|-------------|
| `AppointmentCreate` | Appointment created |
| `AppointmentDelete` | Appointment deleted |
| `AppointmentUpdate` | Appointment updated |

#### Campaign Events
| Event | Description |
|-------|-------------|
| `CampaignStatusUpdate` | Campaign status changed |

#### Contact Events
| Event | Description |
|-------|-------------|
| `ContactCreate` | Contact created |
| `ContactDelete` | Contact deleted |
| `ContactUpdate` | Contact updated |
| `ContactDndUpdate` | Contact DND status updated |
| `ContactTagUpdate` | Contact tags updated |

**ContactCreate Schema:**
```json
{
  "type": "ContactCreate",
  "locationId": "ve9EPM428h8vShlRW1KT",
  "id": "nmFmQEsNgz6AVpgLVUJ0",
  "address1": "3535 1st St N",
  "city": "Dolomite",
  "state": "AL",
  "companyName": "Lorem ipsum",
  "country": "DE",
  "source": "xyz form",
  "dateAdded": "2021-11-26T12:41:02.193Z",
  "dateOfBirth": "2000-01-05T00:00:00.000Z",
  "dnd": true,
  "email": "john@example.com",
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "postalCode": "452001",
  "tags": ["tag1", "tag2"],
  "website": "https://example.com",
  "attachments": [],
  "assignedTo": "userId",
  "customFields": [
    {
      "id": "fieldId",
      "value": "XYZ Corp"
    }
  ]
}
```

#### Conversation Events
| Event | Description |
|-------|-------------|
| `InboundMessage` | Inbound message received |
| `OutboundMessage` | Outbound message sent |
| `ConversationUnreadWebhook` | Conversation marked unread |
| `ConversationProviderOutboundMessage` | Provider outbound message |

#### Invoice Events
| Event | Description |
|-------|-------------|
| `InvoiceCreate` | Invoice created |
| `InvoiceUpdate` | Invoice updated |
| `InvoiceDelete` | Invoice deleted |
| `InvoiceSent` | Invoice sent |
| `InvoicePaid` | Invoice paid in full |
| `InvoicePartiallyPaid` | Invoice partially paid |
| `InvoiceVoid` | Invoice voided |

#### Location Events
| Event | Description |
|-------|-------------|
| `LocationCreate` | Location/sub-account created |
| `LocationUpdate` | Location/sub-account updated |

#### Note Events
| Event | Description |
|-------|-------------|
| `NoteCreate` | Note created |
| `NoteUpdate` | Note updated |
| `NoteDelete` | Note deleted |

#### Opportunity Events
| Event | Description |
|-------|-------------|
| `OpportunityCreate` | Opportunity created |
| `OpportunityUpdate` | Opportunity updated |
| `OpportunityDelete` | Opportunity deleted |
| `OpportunityStageUpdate` | Pipeline stage changed |
| `OpportunityStatusUpdate` | Status changed |
| `OpportunityMonetaryValueUpdate` | Value changed |
| `OpportunityAssignedToUpdate` | Assignment changed |

#### Order Events
| Event | Description |
|-------|-------------|
| `OrderCreate` | Order created |
| `OrderStatusUpdate` | Order status changed |

#### Product Events
| Event | Description |
|-------|-------------|
| `ProductCreate` | Product created |
| `ProductUpdate` | Product updated |
| `ProductDelete` | Product deleted |

#### Price Events
| Event | Description |
|-------|-------------|
| `PriceCreate` | Price created |
| `PriceUpdate` | Price updated |
| `PriceDelete` | Price deleted |

#### Task Events
| Event | Description |
|-------|-------------|
| `TaskCreate` | Task created |
| `TaskComplete` | Task completed |
| `TaskDelete` | Task deleted |

#### User Events
| Event | Description |
|-------|-------------|
| `UserCreate` | User created |

#### Object/Record Events
| Event | Description |
|-------|-------------|
| `ObjectSchemaCreate` | Object schema created |
| `ObjectSchemaUpdate` | Object schema updated |
| `RecordCreate` | Record created |
| `RecordUpdate` | Record updated |
| `RecordDelete` | Record deleted |
| `RelationCreate` | Relation created |
| `RelationDelete` | Relation deleted |

#### Association Events
| Event | Description |
|-------|-------------|
| `AssociationCreate` | Association created |
| `AssociationUpdate` | Association updated |
| `AssociationDelete` | Association deleted |

#### Email Events
| Event | Description |
|-------|-------------|
| `LCEmailStats` | LC Email statistics |

---

## FAQs

### How do I listen to webhook events?

1. Register for an app
2. Go to app settings and update the webhook URL
3. Add the required scope under the scopes section
4. Ask the location/agency admin to go to the app page and click "Add App"
5. Select the location (redirects to redirect URI with authorization code)
6. Use the authorization code to get the access token
7. You will start receiving webhook events for the location

### How long are access tokens valid?

Access tokens are valid for 1 day (24 hours). After expiration, use the refresh token to get a new access token.

### How long are refresh tokens valid?

Refresh tokens are valid for 1 year unless used. When used, the new refresh token is also valid for 1 year.

### Can I get multiple location IDs in the Billing URL?

Yes, for multiple installations you will receive a comma-separated list of locationIds.

### Can I update billing for multiple locations in one call?

No, you need to trigger the webhook for each location and company separately.

---

## Resources

- **Marketplace:** https://marketplace.gohighlevel.com
- **API Documentation:** https://marketplace.gohighlevel.com/docs/oauth/Overview/index.html
- **Developer Council Slack:** https://ghl-developer-council.slack.com
- **Support Email:** marketplace@gohighlevel.com
- **GitHub Repository:** https://github.com/GoHighLevel/highlevel-api-docs

---

*This documentation is compiled from the official GoHighLevel API V2 documentation repository. For the most up-to-date information, please refer to the [official documentation](https://marketplace.gohighlevel.com/docs/oauth/Overview/index.html).*