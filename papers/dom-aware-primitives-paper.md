# DOM-Aware Primitives: Reunifying Web Architecture Through HTTP-Enabled HTML Elements

## Abstract

We present DOM-Aware Primitives, a client-side JavaScript library that extends HTML elements with HTTP methods (GET, POST, PUT, DELETE) to enable direct communication with DOM-Aware Servers (DAS). This approach treats HTML documents as both user interfaces and APIs, using CSS selectors as resource identifiers and standard HTTP methods for state manipulation. By eliminating the traditional separation between HTML for humans and JSON APIs for machines, this architecture simplifies web development while enabling new patterns for real-time collaboration, progressive enhancement, and semantic web applications.

## 1. Introduction

Modern web architecture typically separates presentation (HTML) from data exchange (JSON APIs), requiring developers to maintain parallel structures for human and machine consumption. This separation introduces complexity, synchronization challenges, and violates the original principles of REST as described by Fielding [1].

DOM-Aware Primitives proposes a fundamental shift: HTML elements become directly addressable and mutable resources, accessible through standard HTTP methods. This approach treats the DOM as a hypermedia-driven state engine where each element can respond to HTTP operations, effectively making every HTML document a self-describing API.

## 2. Background and Motivation

### 2.1 Current Web Architecture Limitations

Traditional web applications maintain separate layers:
- HTML/CSS/JavaScript for user interface
- JSON/XML APIs for data exchange
- Custom client code to synchronize between layers

This separation creates several problems:
1. **Duplication of effort** - Similar data structures exist in multiple formats
2. **Synchronization complexity** - Keeping UI and data models consistent requires substantial code
3. **API versioning challenges** - Changes require coordinating updates across multiple systems
4. **Loss of semantic context** - JSON APIs typically lack the rich semantic markup available in HTML

### 2.2 REST Principles Revisited

Fielding's REST dissertation emphasized hypermedia as the engine of application state (HATEOAS) [1]. However, most "RESTful" APIs today:
- Use JSON without hypermedia controls
- Require out-of-band documentation
- Lack self-descriptive messages
- Violate the uniform interface constraint

DOM-Aware Primitives returns to these original principles by using HTML as the hypermedia format, where links and forms provide state transitions, and elements themselves become resources.

## 3. Architecture

### 3.1 Core Concepts

The architecture rests on four key principles:

1. **Elements as Resources**: Each HTML element represents an addressable resource
2. **CSS Selectors as Identifiers**: Selectors provide unique, contextual addressing
3. **HTTP Methods as Operations**: Standard methods (GET, POST, PUT, DELETE) manipulate element state
4. **Progressive Enhancement**: The system degrades gracefully when server support is unavailable

### 3.2 Implementation Details

The client library extends `HTMLElement.prototype` with HTTP methods:

```javascript
element.GET()    // Retrieve element state from server
element.PUT()    // Send element's current state to server
element.POST()   // Append new child element (equivalent to appendChild)
element.DELETE() // Remove element from document
element.HEAD()   // Check element metadata
```

Each operation includes a `Range: selector=<css-selector>` header, allowing the server to identify the target element. The selector generation algorithm prioritizes stability:
1. Use element ID if available (`#elementId`)
2. Reference nearest parent with ID (`#parentId > div:nth-child(2)`)
3. Generate full path only when necessary

### 3.3 The Range Header: Repurposing HTTP Standards

The Range header is traditionally used in HTTP to request partial content from resources, typically for resumable downloads or streaming media. DOM-Aware Primitives repurposes this standard header with a custom range unit: `selector`.

#### Traditional Range Header Usage
```
GET /video.mp4 HTTP/1.1
Range: bytes=200-1023
```

#### DOM-Aware Primitives Range Header
```
PUT /page.html HTTP/1.1
Range: selector=#post-123-title
Content-Type: text/html

<h1>Updated Blog Post Title</h1>
```

This approach offers several advantages:

1. **Standards Compliance**: Reuses existing HTTP infrastructure rather than inventing new headers
2. **Semantic Clarity**: The Range header naturally expresses "which part" of the document
3. **Server Flexibility**: Servers can support both byte ranges and selector ranges
4. **Graceful Degradation**: Non-DAS servers simply ignore unrecognized range units

#### Selector Examples in Practice

```javascript
// Simple ID selector
document.querySelector('#header').PUT()
// Sends: Range: selector=#header

// Contextual selector with parent ID
document.querySelector('#content > p:first-child').DELETE()
// Sends: Range: selector=#content > p:first-child

// Complex selector for deeply nested elements
document.querySelector('.article .comments li:nth-child(3)').GET()
// Sends: Range: selector=.article .comments li:nth-child(3)
```

#### Server-Side Processing

DOM-Aware Servers must:
1. Parse the Range header to extract the CSS selector
2. Apply the selector to their DOM representation
3. Perform the requested operation on the matched element(s)
4. Return appropriate status codes:
   - `206 Partial Content` for successful range operations
   - `416 Range Not Satisfiable` if selector matches no elements
   - `400 Bad Request` for invalid selectors

Example server pseudocode:
```python
def handle_request(request):
    if 'Range' in request.headers:
        range_value = request.headers['Range']
        if range_value.startswith('selector='):
            selector = range_value[9:]  # Remove 'selector=' prefix
            elements = dom.select(selector)
            if not elements:
                return Response(416, "Range Not Satisfiable")
            # Process the matched elements...
```

### 3.4 Server Requirements

DOM-Aware Servers must:
- Signal capability via `Accept-Ranges: selector` header
- Parse and apply CSS selectors from Range headers
- Process HTML payloads
- Return appropriate HTTP status codes

## 4. Use Cases and Applications

### 4.1 Real-Time Collaboration

Multiple users can edit different document sections simultaneously without custom synchronization protocols:

```javascript
// User A modifies and saves a paragraph
const paragraph = document.querySelector('#intro p')
paragraph.textContent = 'Updated introduction text'
await paragraph.PUT()

// User B appends a new comment
document.querySelector('#comments').POST('<div class="comment">New comment</div>')
```

The server handles conflict resolution at the element level rather than document level, enabling fine-grained collaboration.

### 4.2 Progressive Web Applications

Applications can enhance functionality based on server capabilities:

```javascript
document.addEventListener('DASAvailable', () => {
  // Enable auto-save for editable content
  document.querySelectorAll('[contenteditable]').forEach(el => {
    el.addEventListener('blur', () => el.PUT())
  })
})
```

### 4.3 Semantic Web Integration

With microdata or RDFa markup, elements carry semantic meaning:

```html
<div itemscope itemtype="http://schema.org/Person">
  <span itemprop="name">John Doe</span>
  <span itemprop="email">john@example.com</span>
</div>
```

Agents can understand and manipulate structured data without custom APIs.

### 4.4 Content Management Systems

CMSs can expose editing capabilities directly through HTML:

```javascript
// Edit mode: make elements directly mutable
document.querySelectorAll('[data-editable]').forEach(el => {
  el.contentEditable = true
  el.addEventListener('blur', () => {
    // PUT sends the element's current state
    el.PUT()
  })
})
```

## 5. Benefits and Implications

### 5.1 Development Simplification

- **Single source of truth**: HTML serves both presentation and data exchange needs
- **Reduced code complexity**: No separate API integration layer
- **Natural versioning**: HTML's backward compatibility provides inherent versioning

### 5.2 Performance Optimization

- **Granular caching**: Individual elements can be cached and invalidated independently
- **Partial updates**: Only modified elements need transmission
- **Reduced payload size**: No JSON envelope overhead

### 5.3 Security Model

The architecture leverages standard HTTP security mechanisms:
- **Authentication and authorization**: Uses existing HTTP authentication methods (Basic, Bearer, OAuth)
- **Permission discovery**: Clients learn capabilities through HTTP status codes (401, 403, etc.)
- **No client-side permission logic**: Security decisions remain entirely server-side
- **Standard CORS policies**: Cross-origin requests follow established browser security models

This approach ensures that security implementations remain consistent with existing web standards while keeping sensitive logic on the server where it belongs.

## 6. Challenges and Considerations

### 6.1 Browser Compatibility

While the client library uses standard web APIs, older browsers may require polyfills for:
- Fetch API
- CSS selector generation

### 6.2 Server Implementation Complexity

DOM-Aware Servers must:
- Maintain DOM structure server-side
- Handle concurrent modifications
- Implement efficient selector matching

### 6.3 Network Overhead

Each element operation requires an HTTP request, though this can be mitigated through:
- Request batching
- HTTP/2 multiplexing
- Intelligent caching strategies

## 7. Related Work

Several projects explore similar concepts:
- **htmx** [2]: Enables AJAX operations through HTML attributes
- **Hotwire** [3]: Sends HTML over the wire instead of JSON
- **Alpine.js** [4]: Provides reactivity directly in HTML

DOM-Aware Primitives differs by implementing standard HTTP semantics at the element level rather than through custom attributes or protocols.

## 8. Future Directions

### 8.1 Standardization

Working toward web standards adoption could involve:
- W3C proposal for native element HTTP methods
- IETF RFC for selector-based Range headers
- Browser vendor implementation

### 8.2 Tooling Ecosystem

Development tools could include:
- Browser DevTools extensions for element-level debugging
- Server frameworks with built-in DAS support
- Testing libraries for element-based assertions

### 8.3 Advanced Features

Future capabilities might include:
- WebSocket fallback for real-time updates
- Conflict-free replicated data type (CRDT) integration
- Offline synchronization queues
- Implementation of additional HTTP methods (PATCH, OPTIONS)

## 9. Conclusion

DOM-Aware Primitives represents a return to the web's foundational principles while addressing modern development needs. By treating HTML elements as HTTP-accessible resources, we eliminate the artificial separation between human and machine interfaces. This approach simplifies development, enables new collaborative patterns, and provides a path toward truly semantic web applications.

The architecture demonstrates that powerful web applications need not require complex API layers. Instead, by embracing HTML as a hypermedia format and implementing proper REST constraints, we can build systems that are simultaneously simpler and more capable than current approaches.

## References

[1] Fielding, R. T. (2000). Architectural styles and the design of network-based software architectures (Doctoral dissertation, University of California, Irvine).

[2] htmx - high power tools for html. https://htmx.org/

[3] Hotwire: HTML Over The Wire. https://hotwired.dev/

[4] Alpine.js: A rugged, minimal framework for composing JavaScript behavior in your markup. https://alpinejs.dev/

## Appendix A: Code Examples

### Basic Element Operations

```javascript
// Retrieve updated content from server
await element.GET()

// Append new child element
await element.POST('<div>New content</div>')

// Send element's current state to server
await element.PUT()

// Remove element
await element.DELETE()

// Check element metadata
await element.HEAD()
```

### Event Handling

```javascript
element.addEventListener('DASOk', (event) => {
  console.log('Operation successful:', event.detail)
})

element.addEventListener('DASError', (event) => {
  console.error('Operation failed:', event.detail)
})
```

### Progressive Enhancement Pattern

```javascript
// Base HTML works without JavaScript
// <a href="/delete-item?id=123" class="delete-link">Delete</a>

// Enhance with DOM-Aware functionality when available
document.addEventListener('DASAvailable', () => {
  // Replace traditional form/link behavior with direct element operations
  document.querySelectorAll('.delete-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault() // Stop navigation
      
      // Find the item to delete (e.g., parent <li>)
      const item = link.closest('li')
      
      try {
        await item.DELETE()
        // Item removed by server, DOM updated automatically
      } catch (error) {
        // Fall back to traditional navigation if DELETE fails
        window.location.href = link.href
      }
    })
  })
})

// Example: Enhance a todo list that works without JavaScript
document.addEventListener('DASAvailable', () => {
  const todoList = document.querySelector('#todo-list')
  
  // Convert form submission to DOM-aware POST
  const addForm = document.querySelector('#add-todo-form')
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const input = addForm.querySelector('input[name="task"]')
    const newItem = `<li>${input.value}</li>`
    
    try {
      await todoList.POST(newItem)
      input.value = '' // Clear input on success
    } catch (error) {
      // Fall back to form submission
      addForm.submit()
    }
  })
})
```

### Collaborative Editing Example

```javascript
// Auto-save content on blur
document.querySelectorAll('[contenteditable]').forEach(editor => {
  editor.addEventListener('blur', async () => {
    try {
      await editor.PUT()
      editor.classList.add('saved')
    } catch (error) {
      editor.classList.add('error')
    }
  })
})

// Track changes and sync
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.type === 'characterData' || mutation.type === 'childList') {
      mutation.target.PUT()
    }
  })
})

observer.observe(document.querySelector('#collaborative-doc'), {
  childList: true,
  characterData: true,
  subtree: true
})
```

## Appendix B: HTTP Exchange Examples

### Initial Capability Detection

**Request:**
```
OPTIONS / HTTP/1.1
Host: example.com
```

**Response:**
```
HTTP/1.1 200 OK
Accept-Ranges: selector
Allow: GET, HEAD, POST, PUT, DELETE, OPTIONS
```

### GET Operation

**Client Code:**
```javascript
document.querySelector('#sidebar').GET()
```

**HTTP Request:**
```
GET /page.html HTTP/1.1
Host: example.com
Range: selector=#sidebar
```

**HTTP Response:**
```
HTTP/1.1 206 Partial Content
Content-Type: text/html
Content-Range: selector #sidebar

<div id="sidebar">
  <h3>Navigation</h3>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</div>
```

### PUT Operation

**Client Code:**
```javascript
const title = document.querySelector('h1')
title.textContent = 'New Page Title'
await title.PUT()
```

**HTTP Request:**
```
PUT /page.html HTTP/1.1
Host: example.com
Range: selector=h1
Content-Type: text/html

<h1>New Page Title</h1>
```

**HTTP Response:**
```
HTTP/1.1 204 No Content
```

### POST Operation (Append)

**Client Code:**
```javascript
const list = document.querySelector('#todo-list')
await list.POST('<li>New todo item</li>')
```

**HTTP Request:**
```
POST /page.html HTTP/1.1
Host: example.com
Range: selector=#todo-list
Content-Type: text/html

<li>New todo item</li>
```

**HTTP Response:**
```
HTTP/1.1 201 Created
Location: #todo-list > li:last-child
```

### DELETE Operation

**Client Code:**
```javascript
document.querySelector('.advertisement').DELETE()
```

**HTTP Request:**
```
DELETE /page.html HTTP/1.1
Host: example.com
Range: selector=.advertisement
```

**HTTP Response:**
```
HTTP/1.1 204 No Content
```

### Error Scenarios

**Selector Not Found:**
```
HTTP/1.1 416 Range Not Satisfiable
Content-Range: selector */0
```

**Invalid Selector:**
```
HTTP/1.1 400 Bad Request
Content-Type: text/plain

Invalid CSS selector: "#unclosed
```

**Unauthorized Operation:**
```
HTTP/1.1 403 Forbidden
Content-Type: text/plain

User lacks permission to modify element #admin-panel
```