# Review Status

## 🟡 Remaining

### `service_rates.rates` missing `minLength:1` (create-card.js:19)

```
rates[] {
```

Should be:

```
rates[]<minLength:1> {
```

Passing `"rates": []` passes VSL validation and only fails at Mongoose save time.

---

### Import convention (create-card.js:6)

```js
const Messages = require('@app/messages/creator-card');
```

Template convention is through the package entry:

```js
const { CreatorCardMessages } = require('@app/messages');
```

Works either way, just a style difference.

---

### `randomBytes(6)` generates hex, not full alphanumeric (create-card.js:33)

Requirement says: *"random 6-character alphanumeric suffix (e.g., `cook-a8x2k1`)"* — `a8x2k1` uses a-f + 0-9 + letters beyond f. `randomBytes(6)` only produces `[0-9a-f]`. The test expects `/^[a-f0-9]{6}$/` which matches hex, so test and implementation are consistent — just slightly narrower than the example.
