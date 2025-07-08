# dom-aware-primitives

A JavaScript library that extends HTML elements with HTTP-style methods (GET, HEAD, POST, PUT, PATCH, DELETE) to enable direct communication with DOM-aware servers. This allows you to perform server operations directly on DOM elements using familiar HTTP semantics.

## Features

- **HTTP Methods on DOM Elements**: Call `element.POST()`, `element.PUT()`, `element.DELETE()` etc. directly on any HTML element
- **Automatic CSS Selector Generation**: Elements automatically generate unique CSS selectors for server-side identification
- **Progressive Enhancement**: Works with or without DOM-aware server support
- **Event-Driven Architecture**: Rich event system for handling server responses and availability
- **Zero Dependencies**: Pure vanilla JavaScript ES module

## Installation

Simply include the module in your HTML:

```html
<script type="module" src="./index.mjs"></script>
```

Or import it in your JavaScript:

```javascript
import './index.mjs';
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

#### PATCH
```javascript
// Send JSON data
const response = await element.PATCH({ 
  action: 'update', 
  data: { color: 'blue' } 
});
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

## Example Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="./index.mjs"></script>
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

## Browser Compatibility

This library requires modern browser support for:
- ES Modules
- Async/await
- Fetch API
- CustomEvent

## License

Apache License 2.0
