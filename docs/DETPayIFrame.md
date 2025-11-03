# DETPayIFrame Web Component Documentation

## Overview
`<det-pay-iframe>` is a custom element that renders the DETPay checkout experience inside an iframe. The element extends `DETPayBaseElement` to provide common behavior such as attribute parsing, client configuration loading, messaging, and logging.

Once registered, the component is available globally via `customElements.define("det-pay-iframe", DETPayIFrame);`. Importing the package (for example `import "webc-component";`) is enough to register the element.

While client configuration is loading the element renders a lightweight loader template defined in `src/lib/templates.ts`. If a configuration request fails the element swaps to an inline error view so that integrators receive immediate feedback even without listening to events.

## Component lifecycle
- **Construction** – A shadow DOM is created with a wrapper `<iframe>`. Load and error listeners are added to emit lifecycle events.
- **`connectedCallback`** – Runs when the element is attached to the DOM. This reads the attributes, configures the iframe, fetches client configuration (if a `client-id` is provided), prepares the iframe `src`, and sets up the window message bridge.
- **`disconnectedCallback`** – Cleans up the message listener to avoid leaks.

## Observed attributes
The component reacts to changes in the following attributes:

| Attribute | Description |
| --- | --- |
| `client-id` | Client identifier used to fetch configuration data from the API. |
| `redirect-uri` | Optional redirect URL validated against the client configuration. |
| `invoice-id` | Optional invoice identifier used to resume or prefill an existing DETPay invoice. |
| `data-context` | Optional contextual data passed to the iframe. |
| `debug` | Enables debug logging when set to a truthy value (e.g. `debug="true"`). |
| `base-src` | Optional explicit origin used to scope `postToChild` messages. |

Changing these attributes after insertion re-runs the setup logic to keep the iframe in sync.

## Attribute-driven iframe configuration
The iframe receives additional optional attributes when present on the custom element. Defaults are applied when attributes are omitted:

| Attribute | Default | Purpose |
| --- | --- | --- |
| `sandbox` | `allow-scripts allow-forms allow-same-origin allow-popups` | Restricts iframe capabilities. |
| `allow` | `payment *` | Grants additional permissions such as payment handlers. |
| `referrerpolicy` | `no-referrer` | Controls the referrer header. |
| `title` | `Secure payment frame` | Accessible name for assistive tech. |
| `loading` | `eager` | Loading strategy for the iframe. |

## Client configuration fetching
If a `client-id` attribute is provided, the component attempts to fetch client details from `DETPayBaseElement.APIUrl`. On success, the response is stored in `dataConfiguration` and a nonce is cached for future calls. On failure, a `detPay:iframe` event with the `det_pay:config_error` message is emitted and the inline error template is displayed in place of the iframe.

The configuration is used to validate redirect URLs, append context keys, and allow origins for postMessage communication.

When an `invoice-id` attribute is present the iframe URL includes it as `invoice_id`, allowing DETPay to resume an in-progress checkout session.

## Messaging API
The component exposes two major messaging surfaces:

1. **Parent to child (`postToChild`)** – Call `element.postToChild(message)` to send a structured `DETPayMessage` to the iframe. The target origin is derived from the `base-src` attribute or the configuration-provided allowed origin to prevent broadcasting.
2. **Child to parent** – The component listens to `window` `message` events. Messages originating from the iframe window and an allowed origin are converted to bubbled `CustomEvent`s with the naming convention `detPay:${msg.type}`.

The following events are emitted from the element:

| Event name | Trigger |
| --- | --- |
| `detPay:iframe` | General lifecycle events such as load, error, config fetch states. The `detail` object contains `event`, `message`, `origin`, and optional `data`. |
| `detPay:det_pay:ready` | Emitted when the iframe notifies that it is ready. |
| `detPay:det_pay:height` | Sent when the iframe shares a new height. The component automatically updates its `min-height` when the payload is a number. |
| `detPay:det_pay:result` | Outcome of the checkout session. |
| `detPay:det_pay:error` | Error messages from the iframe. |

## Usage
```ts
import "webc-component";

const detPay = document.createElement("det-pay-iframe");
detPay.setAttribute("client-id", "YOUR_CLIENT_ID");
detPay.setAttribute("redirect-uri", "https://example.com/return");
detPay.setAttribute("data-context", JSON.stringify({ cartId: "abc" }));
detPay.setAttribute("base-src", "https://pay.det.co");
detPay.setAttribute("invoice-id", "INV-12345");

detPay.addEventListener("detPay:det_pay:result", (event) => {
  console.log("Checkout result", event.detail);
});

detPay.addEventListener("detPay:iframe", (event) => {
  if (event.detail.event === "det_pay:config_error") {
    console.error("Could not load DETPay", event.detail);
  }
});

document.body.appendChild(detPay);
```

## Events emitted during initialization
During initialization the component emits the following sequence of `detPay:iframe` events that can be observed via `addEventListener("detPay:iframe", handler)`:

1. `det_pay:load` – The iframe DOM finished loading.
2. `det_pay:error` – Emitted if the iframe cannot load.
3. `det_pay:config_loading` – Configuration fetch started (only when `client-id` exists).
4. `det_pay:config_success` – Configuration fetch succeeded.
5. `det_pay:config_error` – Configuration fetch failed (non-2xx status or network error).

## Example project
A runnable example is provided in [`example/index.html`](../example/index.html). After building the component to `example/dist`, run the example dev server to interact with a mock API:

```bash
npm install
npm run build -- --outDir example/dist
cd example
npm install
npm run start
```

The example shows both declarative attribute usage and imperative updates via JavaScript.

## Type definitions
TypeScript consumers can rely on the generated `dist/index.d.ts` which re-exports the `DETPayIFrame` class and the custom element typings included in [`src/types.d.ts`](../src/types.d.ts). This provides strong typing for events and helper methods.

## Troubleshooting

- Ensure `base-src` matches the origin hosting the DETPay iframe; otherwise `postToChild` calls are ignored to prevent cross-origin leakage.
- A `det_pay:config_error` event indicates the client configuration could not be fetched. Check network requests to `DETPayBaseElement.APIUrl` and confirm the `client-id` is valid.
- If `det_pay:height` events are emitted but the element does not resize, verify that no external CSS overrides the component `min-height` style applied when messages are received.
