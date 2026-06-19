# Report

## 🟡 Missing test: Framework validation failure (Test Case 10)

`requirement.md:477-488` — no test sends an invalid enum value like `"archived"` for `status` to verify the VSL catches it and returns HTTP 400 with the framework's error format.

```json
POST /creator-cards
{
  "title": "Bad Status Card",
  "creator_reference": "crt_q1w2e3r4t5y6u7i8",
  "status": "archived"
}
Expected: HTTP 400 with the validator's error response
```

## 🔴 Missing `code` field in all error responses

`core/express/server.js:244-252` — the error handler builds the response but never includes `error.errorCode` in the body.

When `throwAppError('Slug is already taken', ERROR_CODE.SL02)` is thrown:

**Actual response:**
```json
{ "status": "error", "message": "Slug is already taken" }
```

**Required by spec:**
```json
{ "status": "error", "message": "Slug is already taken", "code": "SL02" }
```

Every business rule error (`SL02`, `AC01`, `AC05`, `NF01`, `NF02`, `AC03`, `AC04`) will return HTTP status correctly but will be **missing the `code` field**. The checklist says *"All custom business rule errors return the correct code"* — this fails that check.

**Fix** — `server.js:249`, add:
```js
responseComponents.body.code = error.errorCode || undefined;
```

## 💡 Suggestion: Link click tracking

Add a `link_clicks` counter on each link entry that increments when `GET /creator-cards/:slug/click/:linkIndex` is called. This gives creators analytics on which links perform — addressing the actual product use case of a link-in-bio card beyond basic CRUD.
