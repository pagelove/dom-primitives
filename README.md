# dom-aware-primitives

A JavaScript library that extends HTML elements with HTTP-style methods (GET, HEAD, POST, PUT, DELETE) to enable direct communication with DOM-aware servers. This revolutionary approach treats the HTML document itself as a hypermedia API, unifying the human-readable web with machine-readable services.

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
// Append HTML content
const response = await element.POST('<div>New content</div>');

// Or send FormData
const formData = new FormData();
formData.append('file', fileInput.files[0]);
const response = await element.POST(formData);
```

#### PUT
```javascript
// Replace element on server
const response = await element.PUT();
// Sends element's outerHTML with Range: selector=<element-selector>
```

#### DELETE
```javascript
// Remove element from server
const response = await element.DELETE();
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
<script type="module" src="https://cdn.jsdelivr.net/gh/jamesaduncan/dom-aware-primitives@v1.0.0/index.mjs"></script>

<!-- Then include the WebSocket extension -->
<script type="module" src="https://cdn.jsdelivr.net/gh/jamesaduncan/dom-aware-primitives@v1.0.0/das-ws.mjs"></script>
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

## Server Implementation

For this library to work fully, your server needs to:

1. Respond to OPTIONS requests with `Accept-Ranges: selector` header
2. Parse Range headers with CSS selectors (e.g., `Range: selector=div > p:nth-child(2)`)
3. Handle standard HTTP methods on your endpoints
4. Process HTML content and FormData payloads

Example server response headers:
```
Accept-Ranges: selector
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

## Revolutionary Possibilities

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
   - Academic treatment of the paradigm shift this represents

2. **[A Comparative Analysis of DOM-Aware Primitives and htmx](/papers/dom-aware-primitives-vs-htmx-paper.md)**
   - Detailed comparison with htmx, another hypermedia-driven library
   - Architectural differences between declarative and imperative approaches
   - When to use each approach
   - Feature comparison matrix

## License

Apache License 2.0
