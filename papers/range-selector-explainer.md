# CSS Selectors as HTTP Range Units: An Explainer

## Authors

- James Duncan

## Participate

- GitHub repository: https://github.com/jamesaduncan/dom-aware-primitives
- Issue tracker: https://github.com/jamesaduncan/dom-aware-primitives/issues

## Table of Contents

- [Introduction](#introduction)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [User research](#user-research)
- [Use cases](#use-cases)
- [Proposed solution](#proposed-solution)
- [How it works](#how-it-works)
- [Key scenarios](#key-scenarios)
- [Detailed design discussion](#detailed-design-discussion)
- [Considered alternatives](#considered-alternatives)
- [Stakeholder feedback](#stakeholder-feedback)
- [References and acknowledgements](#references-and-acknowledgements)

## Introduction

The web has evolved two parallel paradigms: HTML for human consumption and JSON APIs for programmatic access. This bifurcation creates unnecessary complexity, duplication, and maintenance burden. More importantly, it represents a fundamental departure from Roy Fielding's REST architectural style and the principle of Hypermedia as the Engine of Application State (HATEOAS).

This explainer proposes extending the HTTP Range header to accept CSS selectors as range units, enabling direct manipulation of HTML documents through standard HTTP methods. This approach returns the web to its RESTful roots, where HTML documents serve as the hypermedia format that Fielding envisioned.

## Goals

- Enable HTML documents to serve as both human interfaces and machine APIs
- Provide granular access to document fragments using existing web standards
- Restore true REST/HATEOAS principles with HTML as the hypermedia format
- Maintain backward compatibility with existing Range header implementations and all server implementations
- Enable permission models at the element level
- Eliminate the false dichotomy between "websites" and "web APIs"

## Non-goals

- Replacing existing byte-range functionality
- Mandating server implementation details
- Defining new HTTP methods or status codes
- Creating a new selector syntax (uses existing CSS selectors)
- Addressing client-side state management

## User research

### Problem statement

Current web architecture requires developers to:
1. Build HTML interfaces for users
2. Create separate JSON APIs for programmatic access
3. Maintain synchronization between these representations
4. Implement complex client-side state management

This duplication violates the DRY principle and increases development complexity. More fundamentally, it violates REST principles by:
- Separating the representation (HTML) from the resource manipulation (API)
- Losing hypermedia controls in API responses
- Requiring out-of-band knowledge of API endpoints
- Breaking the self-descriptive message constraint

### Developer feedback

Developers consistently report frustration with:
- Maintaining parallel data representations
- Complex client-server synchronization logic
- Inability to use HTML's semantic richness in APIs
- Lack of fine-grained permission models for web resources
- The irony of "REST" APIs that aren't actually RESTful

## Use cases

### 1. Content Management Systems

A CMS could expose every content element for direct editing:

```http
PUT /article HTTP/1.1
Range: selector=#headline
Content-Type: text/html

<h1 id="headline">Updated Article Title</h1>
```

### 2. Collaborative Editing

Multiple users could edit different parts of a document simultaneously:

```http
POST /document HTTP/1.1
Range: selector=#comments
Content-Type: text/html

<div class="comment">New comment from Alice</div>
```

### 3. Web Scraping and Automation

Tools could extract specific content without parsing entire documents:

```http
GET /products HTTP/1.1
Range: selector=[itemtype="https://schema.org/Product"]
Accept: text/html
```

### 4. Progressive Enhancement

JavaScript could enhance static HTML with dynamic behavior:

```javascript
// Check if element can be deleted
const response = await fetch('/page', {
  method: 'OPTIONS',
  headers: { 'Range': 'selector=#item-42' }
});
if (response.headers.get('Allow').includes('DELETE')) {
  // Show delete button
}
```

### 5. Microservices with HTML

Services could return HTML fragments instead of JSON:

```http
GET /api/user/profile HTTP/1.1
Range: selector=[itemtype="https://schema.org/Person"]
Accept: text/html
```

### 6. True RESTful APIs

Finally achieve Fielding's vision where the API is driven by hypertext:

```html
<!-- The HTML IS the API -->
<div id="order-123" itemscope itemtype="https://schema.org/Order">
  <span itemprop="orderStatus">OrderProcessing</span>
  <div itemprop="acceptedOffer">
    <span itemprop="price">$99.99</span>
  </div>
</div>
```

```javascript
// Client code is simple and generic
const order = await fetch('/orders/123').then(r => r.text());

// Parse the document to understand current state
const doc = new DOMParser().parseFromString(order, 'text/html');
const status = doc.querySelector('[itemprop=orderStatus]');

// The element itself IS the hypermedia control - directly manipulate it
const updated = await fetch('/orders/123', {
  method: "PUT",
  headers: { 'Range': 'selector=[itemprop=orderStatus]' },
  body: `<span itemprop="orderStatus">OrderCancelled</span>`
});
if ( updated.ok ) {
  status.outerHTML = await updated.text();
}
```

**This represents a fundamental shift**: In traditional REST APIs, hypermedia controls are links that point to state transition endpoints. With Range: selector, **the HTML elements themselves become the hypermedia controls**. The `<span itemprop="orderStatus">` isn't just displaying the order status - it IS the resource endpoint for changing that status. The document structure directly maps to the API structure, making HTML truly self-descriptive. No separate endpoints, no API documentation - just semantic HTML that can be directly manipulated.

## Proposed solution

### Compatibility and Coexistence

This proposal is designed to be fully backward compatible and can coexist with existing web infrastructure:

1. **No Breaking Changes**: The selector range unit is a new addition to the existing Range header specification. Servers that don't understand `Range: selector=...` will simply ignore it or return 400/416, allowing graceful degradation.

2. **Parallel APIs**: Organizations can offer both traditional JSON APIs and selector-based HTML APIs simultaneously:
   ```
   GET /api/v1/orders/123          → Returns JSON
   GET /orders/123                 → Returns HTML
   GET /orders/123 + Range header → Returns HTML fragment
   ```

3. **Progressive Enhancement**: Existing HTML websites can adopt selector ranges incrementally:
   - Start by supporting only GET with selectors
   - Add PUT/DELETE for specific elements as needed
   - Legacy clients continue working with full page loads

4. **CDN and Proxy Friendly**: Standard HTTP semantics mean existing infrastructure (CDNs, proxies, load balancers) continues to work. The Vary: Range header ensures proper caching behavior.

5. **Framework Agnostic**: Works with any server technology that can parse HTTP headers and manipulate HTML/XML documents.

### Range Header Extension

Extend the Range header syntax to include a new range unit type:

```
Range: selector=<css-selector>
```

### Examples

```http
Range: selector=#content
Range: selector=.article:first-child
Range: selector=[data-id="123"]
Range: selector=main > section:nth-child(2)
```

### Server Response

Servers supporting selector ranges MUST:

1. Include `selector` in the Accept-Ranges header. Servers MAY support any combination:
   ```http
   Accept-Ranges: bytes, selector  # Both byte and selector ranges
   Accept-Ranges: selector          # Only selector ranges
   Accept-Ranges: none              # No range support
   ```
   
   Note: Support for selector ranges is independent of byte ranges. A server can support selector ranges without supporting byte ranges.

2. Return the selected content with appropriate status:
   ```http
   HTTP/1.1 206 Partial Content
   Content-Range: selector=#content
   Content-Type: text/html
   
   <div id="content">...</div>
   ```

3. Return 416 Range Not Satisfiable if selector matches nothing:
   ```http
   HTTP/1.1 416 Range Not Satisfiable
   Content-Range: selector */
   ```

## How it works

### 1. Discovery

Clients discover server support through OPTIONS:

```http
OPTIONS /page HTTP/1.1

HTTP/1.1 200 OK
Accept-Ranges: bytes, selector
Allow: GET, HEAD, PUT, DELETE, POST
```

### 2. Reading Elements

```http
GET /page HTTP/1.1
Range: selector=.product-price

HTTP/1.1 206 Partial Content
Content-Range: selector=.product-price
Vary: Range
Content-Type: text/html

<span class="product-price">$29.99</span>
```

### 3. Updating Elements

```http
PUT /page HTTP/1.1
Range: selector=#user-bio
Content-Type: text/html

<p id="user-bio">Updated biography text</p>

HTTP/1.1 206 Partial Content
Content-Range: selector=#user-bio
Vary: Range
Content-Type: text/html

<p id="user-bio">Updated biography text</p>
```

### 4. Adding Elements

```http
POST /page HTTP/1.1
Range: selector=#comments
Content-Type: text/html

<div class="comment">New comment</div>

HTTP/1.1 206 Partial Content
Content-Range: selector=#comments
Vary: Range
Content-Type: text/html
<div class="comment">New comment</div>
```

### 5. Deleting Elements

```http
DELETE /page HTTP/1.1
Range: selector=.temporary-notice

HTTP/1.1 204 No Content
```

**Important Notes:**

1. **206 Partial Content for mutations**: According to the RFC, PUT and POST operations with selector ranges return 206 (Partial Content) status codes, not 2xx success codes. This maintains consistency with the Range header semantics.

2. **Server enrichment**: The partial content returned is what _actually_ gets changed in the document. It MAY NOT match what was sent in the request. This allows for server-side enrichment (adding IDs, timestamps, validation, etc.) while maintaining the document as the engine of application state.

3. **Single element guarantee**: All operations affect only the first matching element in document order, ensuring RESTful semantics and operation idempotency.

## Example scenarios

### Scenario 1: Building a Todo App

Without selector ranges:
- Separate HTML template
- JSON API endpoints
- Client-side state management
- Complex synchronization logic

With selector ranges:
- Single HTML document
- Direct element manipulation
- Server maintains state
- Simple enhancement layer

### Scenario 2: Content Moderation

Moderators could directly delete problematic content:

```http
DELETE /forum/thread HTTP/1.1
Range: selector=#post-789
Authorization: Bearer moderator-token
```

### Scenario 3: A/B Testing

Test different variations by updating specific elements:

```http
PUT /landing HTTP/1.1
Range: selector=.cta-button
X-Variant: B

<button class="cta-button variant-b">Try Now Free!</button>
```

## Detailed design discussion

### Alignment with REST and HATEOAS

Roy Fielding's dissertation defined REST with several key constraints that modern "REST" APIs routinely violate. The Range: selector approach restores these principles:

#### 1. **Hypermedia as the Engine of Application State (HATEOAS)**

Fielding wrote: "REST is defined by four interface constraints: identification of resources; manipulation of resources through representations; self-descriptive messages; and, hypermedia as the engine of application state."

Current state:
```json
// JSON "REST" API - No hypermedia controls
{
  "id": 123,
  "title": "Article",
  "author_id": 456  // Client must know to GET /authors/456
}
```

With Range: selector:
```html
<!-- HTML with hypermedia controls built-in -->
<article id="article-123">
  <h1>Article</h1>
  <a href="/authors/456" rel="author">John Doe</a>
  <!-- The link IS the hypermedia control -->
</article>
```

#### 2. **Self-Descriptive Messages**

The HTML document completely describes its own structure and available operations:

```javascript
// Client discovers capabilities through the representation itself
const response = await fetch('/article', {
  method: 'OPTIONS',
  headers: { 'Range': 'selector=#article-123' }
});
// Allow: GET, PUT, DELETE tells us what we can do
```

#### 3. **Uniform Interface**

Every element uses the same interface - HTTP methods on selectors:
- No custom endpoints to learn
- No API documentation needed
- The HTML structure IS the API

#### 4. **Stateless Interactions**

Each request contains all information needed (the selector) to identify and manipulate the resource fragment. No session state or API keys for resource identification.

### Why CSS Selectors?

1. **Ubiquitous**: Every web developer knows CSS selectors
2. **Powerful**: Can target elements by ID, class, attribute, position, etc.
3. **Stable**: IDs and semantic attributes provide stable endpoints
4. **Contextual**: Can express relationships between elements
5. **RESTful**: Selectors identify resource fragments within the hypermedia representation

### Security Considerations

1. **Selector Injection**: CSS selectors from clients MUST be carefully validated:
   - Validate selector syntax before processing
   - Limit selector complexity (length, combinators, pseudo-classes)
   - Sanitize error messages to avoid information disclosure
   - Consider whitelisting allowed selector patterns
   - Prevent expensive selectors like `*:nth-child(n+1):nth-child(n+2)`

2. **Information Disclosure**: 
   - 416 responses MUST NOT reveal document structure to unauthorized clients
   - Authentication/authorization MUST be checked before processing selectors
   - Elements not visible in full document response MUST NOT be accessible via selectors
   - Error messages should be generic to prevent structure probing

3. **Resource Consumption**:
   - Set timeouts for selector evaluation
   - Limit response size for matched elements
   - Implement rate limiting for selector range requests
   - Monitor and log suspicious selector patterns

4. **Permission Granularity**: Servers can implement fine-grained permissions per selector, enabling element-level access control

### Performance Considerations

1. **Selector Complexity**: Servers may limit selector complexity
2. **Caching**: Content-Range header enables caching of partial responses
3. **Indexing**: Servers can index commonly used selectors

### Multiple Matches

The selector range specification is designed to return only the **first matching element** in document order. This single-element guarantee is fundamental to enabling RESTful operations:

- GET: Returns only the first matching element
- PUT: Replaces only the first matching element
- DELETE: Removes only the first matching element
- POST: Appends content to the first matching element
- HEAD: Returns headers for the first matching element

When multiple elements need to be addressed:
- Use CSS pseudo-classes like `:nth-child(n)` to select specific instances
- Select a container element that includes multiple children
- Use unique attribute selectors like `[data-id="12345"]`

### Error Handling

- 400 Bad Request: Invalid selector syntax
- 416 Range Not Satisfiable: No matches found
- 507 Insufficient Storage: Result too large
- 422 Unprocessable Entity: Valid selector but cannot process

## Considered alternatives

### Custom Headers

Using custom headers like `X-Selector` was considered but:
- Doesn't leverage existing Range infrastructure
- Requires new header standardization
- Loses semantic connection to partial content

### Query Parameters

Using `?selector=...` was considered but:
- Changes resource identity
- Doesn't fit REST semantics
- Complicates caching

### New HTTP Methods

Creating methods like `QUERY` was considered but:
- Requires significant infrastructure changes
- Doesn't leverage existing HTTP semantics
- Creates adoption barriers

### JSON Patch/JSON Pointer

Using JSON-based selection was considered but:
- Requires JSON representation of HTML
- Loses HTML's semantic richness
- Doesn't work with existing HTML content
- Perpetuates the HTML/JSON split that violates REST

### GraphQL/Query Languages

GraphQL and similar approaches were considered but:
- Require learning new query languages
- Add complexity layers
- Move further from REST/HATEOAS principles
- Don't leverage existing browser capabilities

## Stakeholder feedback

### Web Developers

Positive feedback on:
- Simplifying architecture
- Reducing code duplication
- Enabling progressive enhancement

Concerns about:
- Server implementation complexity
- Performance with complex selectors
- Browser support timeline

### Server Implementers

Interest in:
- Reference implementations
- Performance guidelines
- Security best practices

### Standards Bodies

Questions about:
- Interaction with existing Range units
- Formal selector syntax definition
- Backward compatibility guarantees

## REST Principles Restoration

This proposal directly addresses Fielding's observation that most "REST" APIs aren't actually RESTful:

> "What needs to be done to make the REST architectural style clear on the notion that hypertext is a constraint? In other words, if the engine of application state (and hence the API) is not being driven by hypertext, then it cannot be RESTful and cannot be a REST API. Period. Is there some broken manual somewhere that needs to be fixed?" - Roy Fielding, 2008

The Range: selector approach ensures that:

1. **Hypertext drives the application state** - The HTML document contains all navigation and state transitions
2. **No out-of-band information required** - Clients don't need API documentation
3. **Self-descriptive operations** - Standard HTTP methods on standard CSS selectors
4. **True resource identification** - Elements are resources, selectors are their identifiers

## References and acknowledgements

- [RFC 7233: HTTP/1.1 Range Requests](https://tools.ietf.org/html/rfc7233)
- [Selectors Level 4](https://www.w3.org/TR/selectors-4/)
- [REST Architectural Style](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
- [Roy Fielding's REST APIs must be hypertext-driven](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven)
- [HTML Living Standard](https://html.spec.whatwg.org/)

Special thanks to the developers experimenting with DOM-aware primitives and pushing the boundaries of web architecture.

## Appendix: Example Implementation

A minimal Node.js implementation sketch:

```javascript
app.use((req, res, next) => {
  const range = req.get('Range');
  if (range?.startsWith('selector=')) {
    const selector = range.substring(9);
    const doc = parseHTML(await getDocument(req.path));
    const elements = doc.querySelectorAll(selector);
    
    if (elements.length === 0) {
      res.status(416).set('Content-Range', 'selector=*/0').end();
      return;
    }
    
    if (req.method === 'GET') {
      res.status(206)
         .set('Content-Range', `selector=${selector}`)
         .send(elements.map(el => el.outerHTML).join(''));
    }
    // ... handle other methods
  }
  next();
});
```