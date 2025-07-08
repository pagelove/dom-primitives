# DOM-Aware WebSocket Extension

The `das-ws.mjs` module extends DOM-Aware Primitives with real-time streaming capabilities, allowing servers to push DOM updates to connected clients via WebSocket.

## Philosophy

This extension maintains the core DOM-Aware philosophy:
- **The HTML document is the resource** - WebSocket connects to the same URL, just with `ws://` or `wss://` protocol
- **HTML all the way down** - Updates are streamed as semantic HTML with microdata, not JSON
- **Progressive enhancement** - Only activates when a DOM-Aware Server is detected

## Stream Format

Updates are streamed as HTML fragments using the `StreamItem` microdata schema:

```html
<section itemscope itemtype="http://rustybeam.net/StreamItem">
    <h1><span itemprop="method">PUT</span> request</h1>
    <p>
        To <span itemprop="url">http://example.com/todos.html</span> with
        the selector <span itemprop="selector">#todo-item-5</span>.
    </p>
    <h2>Data</h2>
    <div itemprop="content">
        <li id="todo-item-5" class="completed">
            <input type="checkbox" checked>
            <span>Updated todo item text</span>
        </li>
    </div>
</section>
```

### Microdata Properties

- **`method`** (required): HTTP method - `PUT`, `POST`, or `DELETE`
- **`url`** (optional): The URL of the document being updated
- **`selector`** (required): CSS selector identifying the target element
- **`content`** (required for PUT/POST): HTML content to apply

### Operation Semantics

- **PUT**: Replaces the entire element (including the element itself)
- **POST**: Appends children to the target element
- **DELETE**: Removes the element from the DOM

## Usage

```javascript
// Import both libraries
import './index.mjs';  // Core DOM-Aware Primitives
import './das-ws.mjs'; // WebSocket extension

// Subscribe to all document updates
document.addEventListener('DASWebSocketAvailable', () => {
    const subscription = document.SUBSCRIBE({
        onUpdate: (update, result) => {
            console.log(`${result.action} element with selector ${update.selector}`);
        },
        onConnect: (ws) => console.log('Connected to stream'),
        onDisconnect: () => console.log('Disconnected'),
        onError: (error) => console.error('Error:', error),
        reconnect: true,
        reconnectDelay: 1000,
        maxReconnectDelay: 30000
    });
});
```

### Element-Specific Subscriptions

```javascript
// Subscribe to updates for a specific element only
const element = document.querySelector('#todo-list');
const subscription = element.SUBSCRIBE({
    onUpdate: (update, result) => {
        console.log('This element was updated!');
    }
});
```

### Subscription Options

- **`onUpdate(update, result)`**: Called when a DOM update is applied
- **`onConnect(websocket)`**: Called when WebSocket connects
- **`onDisconnect()`**: Called when WebSocket disconnects
- **`onError(error)`**: Called on WebSocket errors
- **`reconnect`**: Enable auto-reconnection (default: true)
- **`reconnectDelay`**: Initial reconnect delay in ms (default: 1000)
- **`maxReconnectDelay`**: Maximum reconnect delay in ms (default: 30000)

### Control Object

The `SUBSCRIBE` method returns a control object:

```javascript
const subscription = document.SUBSCRIBE();

// Check connection state
console.log(subscription.readyState); // Same as WebSocket.readyState

// Close the connection
subscription.close();

// Manually reconnect
subscription.reconnect();

// Send data to server (if needed)
subscription.send('custom message');
```

## Events

The library dispatches these custom events on the document:

- **`DASWebSocketAvailable`**: WebSocket extension is loaded and ready
- **`DASWebSocketConnected`**: Connected to server stream
- **`DASWebSocketDisconnected`**: Disconnected from stream  
- **`DASStreamUpdate`**: DOM update was successfully applied

## Server Requirements

A compatible DOM-Aware Server should:

1. Accept WebSocket connections at the same URL as the HTML document
2. Stream updates as HTML fragments containing StreamItem microdata
3. Include all relevant mutations (from any client or server-side changes)
4. Send complete, parseable HTML fragments

## Example Stream

Multiple updates can be sent in a single message:

```html
<section itemscope itemtype="http://rustybeam.net/StreamItem">
    <h1><span itemprop="method">DELETE</span> request</h1>
    <p>Selector: <span itemprop="selector">#old-notification</span></p>
</section>

<section itemscope itemtype="http://rustybeam.net/StreamItem">
    <h1><span itemprop="method">POST</span> request</h1>
    <p>Selector: <span itemprop="selector">#notifications</span></p>
    <div itemprop="content">
        <div class="notification">New message received!</div>
    </div>
</section>
```

## Security Notes

- Always use `wss://` in production
- Servers should authenticate WebSocket connections
- Servers should only stream updates the client is authorized to see
- All content is treated as HTML and inserted into the DOM - servers must sanitize