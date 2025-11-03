# DETPay Redirect Web Component

`<det-pay-redirect>` is a lightweight helper that exchanges DETPay client credentials for a one-off redirect URL. The component renders an auto-submitting form that forwards the shopper to DETPay without embedding an iframe.

## Getting started

Import the package once to register the element globally, or mount it programmatically via the helper exported from `webc-component/redirect`.

```ts
import "webc-component";

// Declarative usage
// <det-pay-redirect client-id="..." redirect-uri="..." invoice-id="..." auto-submit></det-pay-redirect>

// Functional usage
import { mountDETPayRedirect } from "webc-component/redirect";

const redirectEl = mountDETPayRedirect({
  "client-id": "YOUR_CLIENT_ID",
  "redirect-uri": "https://example.com/return",
  "data-context": JSON.stringify({ cartId: "abc" }),
  "invoice-id": "INV-12345",
  "auto-submit": true,
});

document.body.appendChild(redirectEl);
```

## Attributes

| Attribute | Purpose |
| --- | --- |
| `client-id` | Required DETPay client identifier used to load configuration and create the redirect URL. |
| `redirect-uri` | Optional return URL that must match the allowed redirect list for the client. |
| `invoice-id` | Optional invoice identifier appended to the redirect request so DETPay can resume a specific invoice. |
| `data-context` | Optional JSON payload passed through the redirect request using the configured `dataKey`. |
| `debug` | Enables verbose console logging to aid integration debugging. |
| `auto-submit` | Optional marker attribute indicating that the component should submit as soon as the redirect URL is ready. The component auto-submits by default, so this attribute is primarily for explicitness. |
| `method` | Overrides the HTTP method used when submitting the redirect form (`GET` by default). |
| `target` | Sets the target browsing context for the form submission (`_self` by default). |

The component will validate the provided `redirect-uri` against the client configuration before attempting to redirect. Invalid combinations emit an error template instead of submitting.

Supplying an `invoice-id` adds an `invoice_id` query parameter to the generated redirect URL so DETPay can resume an existing invoice.

## Events

`<det-pay-redirect>` emits the following DOM event:

| Event name | Detail | Description |
| --- | --- | --- |
| `detPay:redirect` | `{ event: "detpay:before-redirect", data: { action, method } }` | Fired immediately before the form submits, giving integrations a final opportunity to react or cancel the navigation. |

Listen for `detPay:redirect` with `addEventListener` to coordinate UI updates or logging. The event bubbles, so it can be handled on ancestor nodes.

## Styling and slots

The component exposes a default slot for custom content that can be shown while the redirect is prepared. Because the internal form lives in the shadow DOM, style it by targeting slotted elements or wrapping the component in your own container.

## Troubleshooting

- Ensure the `client-id` is valid and matches the environment you are targeting.
- Double-check that the `redirect-uri` is whitelisted for the provided client.
- Use the `debug` attribute during development to inspect internal logs and configuration responses.
