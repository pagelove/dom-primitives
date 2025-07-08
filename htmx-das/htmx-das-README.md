# htmx-das: htmx API on DOM-Aware Primitives

This is an implementation of htmx-style declarative attributes using DOM-Aware Primitives as the underlying transport mechanism instead of traditional AJAX.

## Key Differences from Regular htmx

1. **No URLs Required**: Since DOM-Aware Primitives use CSS selectors to identify elements, the URL in attributes like `hx-get="/path"` is ignored. The library operates on elements directly.

2. **Server Requirements**: Requires a DOM-Aware Server (DAS) that understands the Range header with CSS selectors.

3. **HTTP Methods Map to DOM Operations**:
   - `hx-get` → `element.GET()` - Refreshes element from server
   - `hx-post` → `element.POST(content)` - Appends content to element
   - `hx-put` → `element.PUT()` - Updates element on server with current state
   - `hx-delete` → `element.DELETE()` - Removes element

4. **Automatic Element Targeting**: The server knows which element to update based on the CSS selector, not URL routing.

## Usage

```html
<!-- Include DOM-Aware Primitives first -->
<script type="module" src="./index.mjs"></script>

<!-- Then include htmx-das -->
<script src="./htmx-das.js"></script>

<!-- Use htmx attributes as normal -->
<button hx-get="/ignored" hx-trigger="click">
  Refresh from server
</button>

<div hx-delete="/ignored" hx-confirm="Really delete?">
  Click to delete
</div>

<form hx-post="/ignored" hx-target="#results">
  <input name="message">
  <button type="submit">Submit</button>
</form>
```

## Supported Attributes

- `hx-get` - Refresh element from server
- `hx-post` - Append content to target element  
- `hx-put` - Update element on server
- `hx-delete` - Delete element
- `hx-trigger` - Event that triggers the request
- `hx-target` - Element to update (CSS selector)
- `hx-swap` - How to swap content
- `hx-confirm` - Confirmation message
- `hx-indicator` - Loading indicator element

## How It Works

1. htmx-das scans for elements with `hx-*` attributes
2. Sets up event listeners based on `hx-trigger`
3. When triggered, uses the appropriate DOM-Aware Primitive method
4. The server receives the request with a Range header containing the element's CSS selector
5. Server updates the DOM and client reflects changes

## Advantages

- **True REST**: Each element is a resource with uniform interface
- **No routing needed**: CSS selectors replace URL routing
- **Simpler server logic**: One handler for all operations
- **Maintains htmx ergonomics**: Familiar declarative style

## Limitations

- Requires DOM-Aware Server support
- URLs in attributes are ignored (kept for compatibility)
- Some htmx features not applicable (e.g., hx-vals, hx-headers)
- Response processing differs since server directly modifies DOM

## Example Server Behavior

When a client clicks a button with `hx-delete`:

```
DELETE /page HTTP/1.1
Range: selector=#todo-item-1
```

The server:
1. Parses the CSS selector from Range header
2. Finds the element in its DOM representation
3. Removes the element
4. Returns appropriate status code

The client's DOM is automatically synchronized!