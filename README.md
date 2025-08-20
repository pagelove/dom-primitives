# dom-aware-primitives

A JavaScript library that extends HTML elements with HTTP-style methods (GET, HEAD, POST, PUT, DELETE) to enable direct communication with DOM-aware servers. This approach treats the HTML document itself as a hypermedia API, unifying the human-readable web with machine-readable services.

## The Vision

This library implements a profound architectural pattern: **the HTML document becomes simultaneously the user interface AND the API**. Instead of maintaining separate REST endpoints alongside your HTML, the document itself becomes a living, RESTful resource where every element can be directly manipulated through standard HTTP methods.

## Why This Matters

Traditional web architecture forces an artificial separation:
- **HTML** for human users
- **JSON APIs** for programmatic access
- **Complex client-side state management** to sync between them

This approach declares: **there is only one web, and it's hypermedia all the way down.**

### True REST (Finally)

This implements REST as Roy Fielding originally envisioned:
- **Hypermedia as the Engine of Application State (HATEOAS)**: The HTML document IS the hypermedia
- **Self-Describing**: Elements discover their capabilities through HTTP
- **Uniform Interface**: Every element has the same methods
- **Stateless**: Each request contains all context via CSS selectors

## Features

- **HTTP Methods on DOM Elements**: Call `element.POST()`, `element.PUT()`, `element.DELETE()` etc. directly on any HTML element
- **Automatic CSS Selector Generation**: Elements automatically generate unique CSS selectors for server-side identification
- **Progressive Enhancement**: Works with or without DOM-aware server support
- **Event-Driven Architecture**: Rich event system for handling server responses and availability
- **Zero Dependencies**: Pure vanilla JavaScript ES module
- **Permission Discovery**: Server-side permissions revealed through HTTP status codes, not exposed in client code

## Installation

Simply include the module in your HTML:

```html
<script type="module" src="https://jamesaduncan.github.io/dom-aware-primitives/index.mjs"></script>
```

Or import it in your JavaScript:

```javascript
import 'https://jamesaduncan.github.io/dom-aware-primitives/index.mjs';
```

## How It Works

### Server Detection

On load, the library sends an OPTIONS request to check if your server is DOM-aware. A DOM-aware server should respond with:

```
Accept-Ranges: selector
```

### DOM-Aware Mode

When a DOM-aware server is detected, HTML elements gain these methods:

#### GET
```javascript
const element = document.querySelector('#myDiv');
const self = element.GET(); // Returns the element itself
```

#### HEAD
```javascript
const response = await element.HEAD();
// Sends: HEAD request with Range: selector=<element-selector>
```

#### POST
```javascript
// Append HTML content to element - accepts string, HTMLElement, or DocumentFragment

// String
const response = await element.POST('<div>New content</div>');

// HTMLElement
const newDiv = document.createElement('div');
newDiv.textContent = 'New content';
newDiv.className = 'highlight';
await element.POST(newDiv);

// DocumentFragment
const fragment = document.createDocumentFragment();
const p = document.createElement('p');
p.textContent = 'Paragraph 1';
fragment.appendChild(p);
const span = document.createElement('span');
span.textContent = 'Span content';
fragment.appendChild(span);
await element.POST(fragment);

// Sends the HTML with Range: selector=<element-selector>
// If server responds with HTML content, it's automatically appended to the element
```

#### PUT
```javascript
// Replace element
const response = await element.PUT();
// Sends element's outerHTML with Range: selector=<element-selector>
// If server responds with HTML content, the element is replaced with the response
```

#### DELETE
```javascript
// Delete element
const response = await element.DELETE();
// If successful (2xx response), the element is automatically removed from the DOM
```

### Non-DOM-Aware Mode

When the server is not DOM-aware, all methods dispatch a `DASUnavailable` event instead of making HTTP requests.

## Events

The library dispatches several events on the document:

### DASAvailable
Fired when a DOM-aware server is detected:
```javascript
document.addEventListener('DASAvailable', () => {
  console.log('DOM-aware server detected!');
});
```

### DASUnavailable
Fired when the server is not DOM-aware or when operations are attempted without server support:
```javascript
document.addEventListener('DASUnavailable', () => {
  console.log('DOM-aware server not available');
});
```

### DASOk
Fired on successful HTTP operations (bubbles up from the target element):
```javascript
element.addEventListener('DASOk', (event) => {
  console.log('Operation successful:', event.detail.response);
});
```

### DASError
Fired on failed HTTP operations (bubbles up from the target element):
```javascript
element.addEventListener('DASError', (event) => {
  console.log('Operation failed:', event.detail.response);
});
```

### http-can
Fired when the `<http-can>` element shows its content (permissions allowed):
```javascript
document.addEventListener('http-can', (event) => {
  console.log('Permissions granted:', event.detail);
  // { methods: ['GET'], allowed: ['GET', 'POST'], selector: '#item', href: '/page' }
});
```

### http-cannot
Fired when the `<http-can>` element hides its content (permissions denied) or when `<http-cannot>` shows its content:
```javascript
document.addEventListener('http-cannot', (event) => {
  console.log('Permissions denied:', event.detail);
  // { methods: ['DELETE'], allowed: ['GET'], selector: '#item', href: '/page' }
});
```

## CSS Selector Generation

Every HTML element automatically gets a `selector` property that generates a unique CSS path:

```javascript
const element = document.querySelector('#myDiv');
console.log(element.selector); 
// Output: "html:nth-child(1) > body:nth-child(2) > div:nth-child(1)"
```

This selector is used in the Range header to identify elements on the server.

## WebSocket Streaming Extension

The library includes an optional WebSocket extension (`das-ws.mjs`) that enables real-time streaming updates from DOM-aware servers. When included, it automatically subscribes to the current page and applies server-sent DOM updates in real-time.

### Including the WebSocket Extension

```html
<!-- Include the main library first -->
<script type="module" src="https://jamesaduncan.github.io/dom-aware-primitives/index.mjs"></script>

<!-- Then include the WebSocket extension -->
<script type="module" src="https://jamesaduncan.github.io/dom-aware-primitives/das-ws.mjs"></script>
```

### Automatic Subscription

When loaded on a DOM-aware server, the extension automatically:
- Establishes a WebSocket connection to the current page URL
- Listens for streaming updates in microdata format
- Applies DOM changes (POST, PUT, DELETE) in real-time
- Prevents re-application of local changes (avoiding echo effects)
- Handles reconnection with exponential backoff

### Manual Subscription Control

You can also manually control subscriptions:

```javascript
// Subscribe to the entire document
const subscription = document.SUBSCRIBE({
  onUpdate: (update, result) => {
    console.log('DOM updated:', update);
  },
  onConnect: () => {
    console.log('WebSocket connected');
  },
  onDisconnect: () => {
    console.log('WebSocket disconnected');
  },
  onError: (error) => {
    console.error('WebSocket error:', error);
  }
});

// Subscribe to a specific element
const elementSubscription = element.SUBSCRIBE({
  onUpdate: (update, result) => {
    // Only receives updates for this specific element
    console.log('Element updated:', update);
  }
});

// Control the subscription
subscription.close();        // Close connection
subscription.reconnect();    // Force reconnection
subscription.send(data);     // Send data to server
```

### WebSocket Events

The extension dispatches these events:

- `DASWebSocketAvailable` - WebSocket extension is loaded and ready
- `DASWebSocketConnected` - WebSocket connection established
- `DASWebSocketDisconnected` - WebSocket connection closed
- `DASStreamUpdate` - DOM update applied from stream

### Debugging

Enable debug logging by setting:
```javascript
window.DAS_WS_DEBUG = true;
```

## Permission Checking

The library provides two ways to check HTTP method permissions:

### JavaScript API: window.server.can()

Check permissions programmatically using Selector-Request syntax:

```javascript
// Check method on a path (relative to current server)
const canGet = await window.server.can('GET', '/api/users');

// Check method on absolute URL
const canPost = await window.server.can('POST', 'https://api.example.com/posts');

// Check method on a selector (current page)
const canDelete = await window.server.can('DELETE', '#(selector=#comment-42)');

// Check method on a selector at specific URL
const canEdit = await window.server.can('PUT', 'https://example.com/page#(selector=.editable)');

// Check multiple methods (AND logic - all must be allowed)
const canManage = await window.server.can(['GET', 'PUT'], '#(selector=#content)');

// With custom cache TTL (in seconds)
const canUpdate = await window.server.can('POST', '/api/posts#(selector=.new-post)', { ttl: 60 });

// The API returns true/false
if (await window.server.can('DELETE', '#(selector=#item-123)')) {
    // Show delete button
}
```

**Selector-Request Syntax:**
- `/path` - Check permissions on path relative to current server
- `http://example.com/path` - Check permissions on absolute URL
- `#(selector=.className)` - Check permissions for selector on current page
- `http://example.com/path#(selector=#id)` - Check permissions for selector on specific URL

The Selector-Request syntax is parsed by the included `selector-request` module, which correctly handles complex CSS selectors including those with nested parentheses like `:nth-child(15)` or `:has(> p)`.

### HTTP-Can WebComponent

The `<http-can>` WebComponent conditionally displays content based on HTTP method permissions. It makes OPTIONS requests with Range headers to check what methods are allowed on specific elements. This component is automatically available when you include the main library - no additional imports needed.

### Basic Usage

```html
<!-- Single method check -->
<http-can method="DELETE" selector="#todo-item">
  <button onclick="document.querySelector('#todo-item').DELETE()">
    Delete Todo
  </button>
</http-can>

<!-- Multiple methods (AND logic - all must be allowed) -->
<http-can method="PUT,DELETE" selector=".admin-panel">
  <div class="admin-controls">
    <button>Edit</button>
    <button>Delete</button>
  </div>
</http-can>

<!-- With custom cache TTL (in seconds) -->
<http-can method="POST" selector="#comments" cache-ttl="60">
  <form>
    <textarea name="comment"></textarea>
    <button type="submit">Post Comment</button>
  </form>
</http-can>

<!-- With loading indicator -->
<http-can method="DELETE" selector="#item">
  <span slot="loading">Checking permissions...</span>
  <button>Delete</button>
</http-can>

<!-- Using 'closest' to find target element -->
<http-can method="DELETE" closest=".item">
  <button>Delete Item</button>
</http-can>

<!-- Nested example with closest -->
<article id="post-123">
  <h2>Blog Post Title</h2>
  <p>Content...</p>
  <footer>
    <!-- This will check permissions on the parent article -->
    <http-can method="PUT" closest="article">
      <button>Edit Post</button>
    </http-can>
  </footer>
</article>

<!-- Check permissions on arbitrary URL -->
<http-can method="GET" href="/api/admin">
  <a href="/admin">Admin Panel</a>
</http-can>

<!-- Method defaults to GET when not specified -->
<http-can href="/auth/">
  <a href="/auth/" class="admin-link">Administration</a>
</http-can>

<!-- Check permissions for selector on different page -->
<http-can method="DELETE" selector="#comment-42" href="/posts/123">
  <button>Delete Comment</button>
</http-can>

<!-- Using selector-request syntax in href -->
<http-can method="PUT" href="/posts/123#(selector=.editable)">
  <button>Edit Post</button>
</http-can>

<!-- Selector in href for external site -->
<http-can method="GET" href="https://api.example.com/data#(selector=#public-info)">
  <div>Access Public Data</div>
</http-can>

<!-- Mixed case methods are supported -->
<http-can method="put,Delete" selector="#content">
  <button>Edit Content</button>
</http-can>
```

### Attributes

- `method` - HTTP method(s) to check, comma-separated for multiple (optional, defaults to GET, case-insensitive)
- `selector` - CSS selector to check permissions for (optional if href contains selector or closest is used) 
- `closest` - CSS selector to find the nearest ancestor element for permission checking (alternative to selector)
- `href` - URL to send the OPTIONS request to, supports selector-request syntax (optional, defaults to current page)
- `cache-ttl` - Cache duration in seconds (default: 300)

**Notes:**
- The `href` attribute supports selector-request syntax: `/path#(selector=.className)`
- If both `selector` attribute and selector in `href` are provided, the `selector` attribute takes precedence
- The `closest` attribute uses `Element.closest()` to find the target element from the http-can element's position
- When using `closest`, the generated selector for the found element will prefer IDs for stability
- When a selector is specified (either way), it's sent in the Range header of the OPTIONS request

### Events

The component dispatches these events:

- `http-can` - Fired when content is shown (permissions granted)
- `http-cannot` - Fired when content is hidden (permissions denied)
- `http-can-error` - Request failed

```javascript
document.addEventListener('http-cannot', (event) => {
  console.log('Access denied:', event.detail);
  // { methods: ['PUT', 'DELETE'], allowed: ['GET'], selector: '#item', href: '/page' }
});
```

### Features

- **Fail-closed security** - Content hidden by default until permissions verified
- **Smart caching** - Reduces redundant OPTIONS requests (shared with window.server.can())
- **Reactive** - Re-checks when attributes change
- **AND logic** - Multiple methods all must be allowed
- **DOM-aware visibility** - Visible content stays in light DOM for full accessibility, hidden content moves to shadow DOM
- **Authorization change handling** - Automatically re-checks permissions when HTTPAuthChange events occur

Note: Both `window.server.can()` and `<http-can>` share the same permission cache, so checking the same permissions through either API will reuse cached results.

### HTTPAuthChange Event

The `http-can` element automatically listens for `HTTPAuthChange` events on the document. When this event is dispatched, all `http-can` elements will re-check their permissions with fresh (non-cached) OPTIONS requests. This is useful when user authorization changes (login, logout, role changes, etc.).

```javascript
// Dispatch HTTPAuthChange after login/logout
async function login(credentials) {
    await performLogin(credentials);
    // Notify all http-can elements to re-check permissions
    document.dispatchEvent(new CustomEvent('HTTPAuthChange'));
}

async function logout() {
    await performLogout();
    // Notify all http-can elements to re-check permissions
    document.dispatchEvent(new CustomEvent('HTTPAuthChange'));
}

// Or when permissions might have changed
function onPermissionsUpdated() {
    document.dispatchEvent(new CustomEvent('HTTPAuthChange'));
}
```

When `HTTPAuthChange` is dispatched:
- All `http-can` elements immediately re-check their permissions
- The checks bypass all caches (internal and browser cache)
- Elements will show/hide based on the fresh authorization status
- This happens automatically - no additional code needed

### HTTP-Cannot WebComponent

The `<http-cannot>` WebComponent is the inverse of `<http-can>` - it shows content when permissions are **denied**. This is useful for displaying fallback UI, help text, or upgrade prompts when users lack the required permissions.

### Basic Usage

```html
<!-- Show message when DELETE is not allowed -->
<http-cannot method="DELETE" selector="#protected-item">
  <div class="warning">
    You don't have permission to delete this item.
  </div>
</http-cannot>

<!-- Show help text for restricted sections -->
<http-cannot method="PUT,DELETE" selector=".admin-section">
  <p>Contact an administrator to modify this section.</p>
</http-cannot>

<!-- Combine with http-can for complete UI -->
<http-can method="PUT" selector="#profile">
  <button>Edit Profile</button>
</http-can>
<http-cannot method="PUT" selector="#profile">
  <span>Read-only access</span>
</http-cannot>

<!-- Using 'closest' attribute -->
<article id="post-123">
  <footer>
    <http-can method="POST" closest="article">
      <button>Add Comment</button>
    </http-can>
    <http-cannot method="POST" closest="article">
      <span>Comments disabled</span>
    </http-cannot>
  </footer>
</article>

<!-- Show upgrade prompts -->
<http-cannot method="POST" href="/api/premium">
  <div class="upgrade-prompt">
    🔒 Premium feature - <a href="/upgrade">Upgrade to access</a>
  </div>
</http-cannot>
```

### Attributes

`http-cannot` supports all the same attributes as `http-can`:
- `method` - HTTP method(s) to check (comma-separated, defaults to GET)
- `selector` - CSS selector for the target element
- `closest` - CSS selector to find the nearest ancestor element
- `href` - URL to check permissions against
- `cache-ttl` - Cache duration in seconds

### Events

Since `http-cannot` inherits from `http-can`, it uses the same event names:

- `http-cannot` - Fired when content is shown (permissions denied)
- `http-can` - Fired when content is hidden (permissions granted)
- `http-can-error` - Request failed

```javascript
document.addEventListener('http-cannot', (event) => {
  console.log('Access denied - showing fallback content:', event.detail);
  // { methods: ['DELETE'], allowed: ['GET', 'PUT'], selector: '#item', href: '/page' }
});
```

### Features

- **Inverse logic** - Shows content when permissions are denied
- **Fail-open on error** - Shows content if permission check fails
- **Shared cache** - Reuses the same permission cache as `http-can`
- **Same attributes** - Fully compatible with `http-can` attributes
- **DOM-aware visibility** - Visible content stays in light DOM for full accessibility, hidden content moves to shadow DOM
- **Authorization change handling** - Automatically re-checks permissions when HTTPAuthChange events occur

### HTTPAuthChange Event

Like `http-can`, the `http-cannot` element also listens for `HTTPAuthChange` events. When authorization changes occur, all `http-cannot` elements will re-check permissions and update their visibility accordingly.

```javascript
// Example: Show/hide upgrade prompts based on user status
async function upgradeAccount() {
    await performUpgrade();
    // Both http-can and http-cannot elements will update
    document.dispatchEvent(new CustomEvent('HTTPAuthChange'));
}

// Example: Complete UI updates on role change
async function changeUserRole(newRole) {
    await updateRole(newRole);
    // All permission-aware elements update automatically
    document.dispatchEvent(new CustomEvent('HTTPAuthChange'));
}
```

This enables seamless UI transitions where:
- `http-can` elements appear when permissions are granted
- `http-cannot` elements disappear when permissions are granted
- The inverse happens when permissions are revoked
- All updates happen automatically with fresh permission checks

## Server Implementation

For this library to work fully, your server needs to:

1. Respond to OPTIONS requests with `Accept-Ranges: selector` header
2. Parse Range headers with CSS selectors (e.g., `Range: selector=div > p:nth-child(2)`)
3. Return appropriate `Allow` header for OPTIONS requests with Range headers
4. Handle standard HTTP methods on your endpoints
5. Process HTML content payloads

Example server response for OPTIONS with Range header:
```
HTTP/1.1 200 OK
Accept-Ranges: selector
Allow: GET, POST, PUT, DELETE
Content-Type: text/html
```

### Reference Implementation: Rusty-Beam

[Rusty-Beam](https://github.com/jamesaduncan/rusty-beam) is a complete DOM-aware server implementation written in Rust that works with this library. It demonstrates:

- **Plugin-based architecture** for extensible server functionality
- **Stateless DOM manipulation** - operates on HTML files without maintaining server-side state
- **Range header parsing** to extract CSS selectors from requests
- **Full HTTP method support** for DOM operations (GET, PUT, POST, DELETE)
- **HTML-as-configuration** - even the server config is DOM-aware!

Example interaction:
```bash
# Extract an element
curl -H "Range: selector=#content" http://localhost:8080/page.html

# Update an element
curl -X PUT -H "Range: selector=#title" -d '<h1>New Title</h1>' http://localhost:8080/page.html

# Delete elements
curl -X DELETE -H "Range: selector=.temporary" http://localhost:8080/page.html
```

## Example Usage

### Basic Operations

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="https://jamesaduncan.github.io/dom-aware-primitives/index.mjs"></script>
</head>
<body>
    <div id="content">
        <h1>My Page</h1>
        <p>Some content</p>
    </div>
    
    <script type="module">
        // Listen for server availability
        document.addEventListener('DASAvailable', async () => {
            const content = document.querySelector('#content');
            
            // Add new content
            await content.POST('<p>New paragraph</p>');
            
            // Update the h1
            const h1 = content.querySelector('h1');
            h1.textContent = 'Updated Title';
            await h1.PUT();
            
            // Delete a paragraph
            const p = content.querySelector('p');
            await p.DELETE();
        });
        
        // Handle errors
        document.addEventListener('DASError', (e) => {
            console.error('Operation failed:', e.detail);
        });
    </script>
</body>
</html>
```

### Advanced: Using IDs for Stable Selectors

```html
<article id="post-123">
    <h1 id="post-123-title">Original Title</h1>
    <div id="post-123-content">Content here</div>
</article>

<script type="module">
    // IDs make selectors as stable as traditional REST endpoints
    const title = document.querySelector('#post-123-title');
    await title.PUT(); // Range: selector=#post-123-title
</script>
```

### Advanced: Working with Imported Nodes

When elements are imported from other documents (e.g., via `importNode` or from iframes), the HTTP methods automatically use the element's `baseURI` to ensure requests go to the correct server:

```javascript
// Import a node from an iframe
const iframe = document.querySelector('iframe');
const importedNode = document.importNode(
    iframe.contentDocument.querySelector('#remote-content'), 
    true
);
document.body.appendChild(importedNode);

// This will make a request to the iframe's origin, not the current page
await importedNode.PUT(); // Uses importedNode.baseURI

// You can also work with elements from different domains
const externalDoc = await fetch('https://other-domain.com/page.html')
    .then(r => r.text())
    .then(html => new DOMParser().parseFromString(html, 'text/html'));

const externalElement = document.importNode(
    externalDoc.querySelector('#external-content'),
    true
);

// Operations on imported elements go to their original server
await externalElement.DELETE(); // Request goes to https://other-domain.com
```

This feature enables powerful cross-document workflows while maintaining the correct server context for each element.

### Advanced: Semantic Operations with Microdata

```html
<article itemscope itemtype="https://schema.org/BlogPosting" id="post-123">
    <h1 itemprop="headline" id="headline-123">My Blog Post</h1>
    <div itemprop="author" itemscope itemtype="https://schema.org/Person">
        <span itemprop="name" id="author-name">Jane Doe</span>
    </div>
    <div itemprop="articleBody" id="content-123">
        <p>Article content...</p>
    </div>
</article>

<script type="module">
    // Update semantically meaningful elements
    const headline = document.querySelector('[itemprop="headline"]');
    headline.textContent = "Updated: My Blog Post";
    await headline.PUT();
    
    // The server can validate against schema.org constraints
</script>
```

### Advanced: Permission Discovery Pattern

```javascript
// Instead of checking permissions upfront, discover through action
async function makeEditable(element) {
    // Try to probe capabilities
    const response = await element.HEAD();
    const allowed = response.headers.get('Allow') || '';
    
    if (allowed.includes('PUT')) {
        element.contentEditable = true;
        element.addEventListener('blur', async () => {
            const result = await element.PUT();
            if (result.status === 403) {
                element.contentEditable = false;
                showMessage("You don't have permission to edit this");
            }
        });
    }
}

// Apply to all elements with edit-on-click behavior
document.querySelectorAll('[data-editable]').forEach(makeEditable);
```

## Enabled Possibilities

### 1. Collaborative Editing
Every element becomes a potential collaboration point. Multiple users can edit different parts of the same document with automatic conflict resolution through HTTP status codes.

### 2. Progressive Enhancement That Actually Works
- Search engines see normal HTML with microdata
- JavaScript enhances it with editing capabilities
- No complex hydration or server/client state sync

### 3. Universal API Clients
Since every DOM-aware site uses the same interface, one client can work with any website:
```javascript
// This code works on ANY DOM-aware website
async function universalDelete(selector) {
    const element = document.querySelector(selector);
    return await element.DELETE();
}
```

### 4. Granular Permissions Without Client Exposure
Permissions live entirely server-side. The client discovers capabilities through HTTP status codes, preventing permission enumeration attacks.

### 5. The Document Becomes the Database
With IDs and microdata, HTML documents become queryable, editable databases where:
- CSS selectors are your query language
- HTTP methods are your transactions
- Schema.org provides your type system

### 6. AI-Native Web
LLMs can understand and manipulate any website that follows this pattern, as the semantics are built into the HTML structure itself.

## Browser Compatibility

This library requires modern browser support for:
- ES Modules
- Async/await
- Fetch API
- CustomEvent

## The Future

This approach suggests a future where:
- **Every website is an API** - no separate endpoints needed
- **HTML is the universal data format** - human and machine readable
- **Permissions are element-granular** - security at the finest level
- **The web is truly semantic** - meaning embedded in structure

## Further Reading

For deeper analysis and context about DOM-Aware Primitives:

1. **[DOM-Aware Primitives: Reunifying Web Architecture Through HTTP-Enabled HTML Elements](/papers/dom-aware-primitives-paper.md)**
   - Comprehensive technical overview of the DOM-Aware Primitives concept
   - Architectural principles and implementation details
   - Use cases and future directions
   - Academic treatment of the shift this represents

2. **[DRAFT RFC: Selector Range Unit](/papers/draft-selector-range-unit.txt)**
   - A first draft of an RFC to document the core HTTP mechanic that makes DOM aware primitives useful.

## License

Apache License 2.0
