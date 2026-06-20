# Creator Card Microservice

A dedicated microservice built on Node.js/Express for managing "Creator Cards" – dynamic digital business cards where creators can showcase their podcast, social links, and specific service rates (UGC, Brand Deals, etc.).

---

## 🚀 API Documentation

Base URL path for all endpoints: `/creator-cards`

---

### 1. Create a Creator Card
**Endpoint:** `POST /creator-cards`

Creates a new creator card. If no `slug` is provided, a URL-friendly slug is automatically generated from the title.

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **Yes** | 3-100 characters. |
| `description` | string | No | Max 500 characters. |
| `slug` | string | No | 5-50 characters. Only letters, numbers, hyphens, and underscores. Must be globally unique for active cards. |
| `creator_reference` | string | **Yes** | Exactly 20 characters. Identifier mapping to the creator. |
| `links` | array | No | Array of link objects containing `title` and `url`. |
| `service_rates` | object | No | Object containing `currency` (NGN/USD/GBP/GHS) and `rates` array. |
| `status` | string | **Yes** | Must be `draft` or `published`. |
| `access_type` | string | No | `public` (default) or `private`. |
| `access_code` | string | No | Exactly 6 alphanumeric characters. Required if `access_type` is `private`. Not allowed if `public`. |

#### Successful Response (200 OK)
```json
{
  "status": "success",
  "message": "Creator Card Created Successfully.",
  "data": {
    "id": "01KVGVXB101TN8XGCZHR6AS46T",
    "title": "George Cooks",
    "description": "Weekly cooking podcast",
    "slug": "george-cooks",
    "creator_reference": "crt_8f2k1m9x4p7w3q5z",
    "status": "published",
    "access_type": "public",
    "access_code": null,
    "created": 1781903830048,
    "updated": 1781903830048,
    "deleted": null
  }
}
```

#### Error Codes (HTTP 400)
* **SL02**: `Slug is already taken` (When a client-provided slug is in use by an active card).
* **AC01**: `Private cards require a 6-character access_code`
* **AC05**: `Public cards cannot have an access_code`

---

### 2. Retrieve a Creator Card
**Endpoint:** `GET /creator-cards/:slug`

Retrieves a published creator card. If the card is private, the correct `access_code` must be provided in the query string.

#### Query Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `access_code` | string | Conditional | Required if the card's `access_type` is `private`. |

#### Successful Response (200 OK)
Returns the card details without exposing the `access_code`.

```json
{
  "status": "success",
  "message": "Creator Card Retrieved Successfully.",
  "data": {
    "id": "01KVGVXB101TN8XGCZHR6AS46T",
    "title": "George Cooks",
    "slug": "george-cooks",
    "status": "published",
    "access_type": "public"
    // ... other fields (access_code is strictly omitted)
  }
}
```

#### Error Codes (HTTP 404 / 403 / 400)
* **NF01** (HTTP 404): `Creator card not found` (Card doesn't exist or is soft-deleted)
* **NF02** (HTTP 404): `Card is not published` (Card exists but status is `draft`)
* **AC03** (HTTP 403): `This card is private. Please provide an access_code.`
* **AC04** (HTTP 403): `Invalid access_code provided.`

---

### 3. Delete a Creator Card
**Endpoint:** `DELETE /creator-cards/:slug`

Soft-deletes a creator card by setting the `deleted` timestamp. A card can only be deleted if the caller provides the correct `creator_reference`.

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `creator_reference` | string | **Yes** | Must match the `creator_reference` of the card to authorize deletion. |

#### Successful Response (200 OK)
Returns the exact state of the card just prior to deletion, but with an updated `deleted` timestamp.

```json
{
  "status": "success",
  "message": "Creator Card Deleted Successfully.",
  "data": {
    "id": "01KVGVXB101TN8XGCZHR6AS46T",
    "title": "George Cooks",
    "slug": "george-cooks",
    "deleted": 1781913830000
    // ... other fields
  }
}
```

#### Error Codes (HTTP 404)
* **NF01** (HTTP 404): `Creator card not found` (Returned if the card doesn't exist, is already deleted, or if the `creator_reference` is incorrect).

---

## 🛠 Setup & Deployment

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   You only need one environment variable to run this in production:
   * `MONGODB_URI` = Your MongoDB connection string.
   * `PORT` = (Optional, injected automatically by hosting platforms like Render).

3. **Start Server:**
   ```bash
   npm start
   ```

4. **Run Tests:**
   ```bash
   npm test
   ```
   *(Test suite requires `USE_MOCK_MODEL=1` set in the environment, which is handled automatically by the test script).*
