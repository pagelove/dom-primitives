# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Code should always be beautiful. Especially code that is about to be released.

## Beautiful code

Beautiful code, is well-factored code, and code-paths should not be duplicated.
Beautiful code has named methods and function that explain their purpose, and won't confused the reader by being misnamed.
Beautiful code doesn't have extra debugging information in it.
Beautiful code is also well documented.

More importantly, and this is ** CRITICAL **, is that the code works as intended at all times.

## Architectural Vision

This library implements a profound paradigm shift in web architecture:

**The HTML document becomes simultaneously the user interface AND the API.**

### Core Principles

1. **There is only one web, and it's hypermedia all the way down** - No artificial separation between HTML for humans and JSON APIs for machines.

2. **True REST implementation** - This fulfills Roy Fielding's original REST vision better than traditional "REST" APIs:
   - The HTML document IS the hypermedia (HATEOAS)
   - Elements discover their capabilities through HTTP
   - Uniform interface on every element
   - Stateless with all context in CSS selectors

3. **Security through opacity** - Permissions aren't exposed in client code. Clients discover capabilities by attempting operations and receiving HTTP status codes.

4. **Semantic stability** - Using IDs and microdata, selectors become as stable as traditional REST endpoints while maintaining semantic meaning.

### Key Insights

- **HTML elements are resources** - Each element can be addressed and manipulated individually
- **CSS selectors are resource identifiers** - Like URIs but with positional context
- **HTTP methods are state transitions** - Standard CRUD operations on any element
- **The document is the database** - Queryable, mutable, with built-in presentation

## Overview

This is a client-side JavaScript library that adds HTTP-style methods (GET, HEAD, POST, PUT, DELETE) to HTML elements for communicating with DOM-aware servers (DAS). The library extends HTMLElement.prototype to enable direct HTTP operations on DOM elements.

## Architecture

### Core Components

1. **index.mjs** - Main library file that:
   - Detects if the server is DOM-aware via OPTIONS request checking for 'Accept-Ranges: selector' header
   - Extends HTMLElement.prototype with HTTP methods
   - Provides two modes of operation:
     - DAS-aware mode: Full HTTP operations using CSS selectors
     - Non-DAS mode: Methods dispatch 'DASUnavailable' events

2. **das-ws.mjs** - WebSocket streaming extension that:
   - Automatically subscribes to the current page when loaded
   - Establishes WebSocket connection at the same URL (converts http:// to ws://)
   - Listens for DOM updates in microdata format (StreamItem)
   - Applies real-time changes (POST, PUT, DELETE) to the DOM
   - Prevents re-application of local changes through operation tracking
   - Handles automatic reconnection with exponential backoff
   - Extends both Document and HTMLElement prototypes with SUBSCRIBE method

3. **Element Selector Generation** - Custom `selector` property that generates unique CSS selectors for any element

4. **Event System**:
   - `DASAvailable` - Fired when DOM-aware server is detected
   - `DASUnavailable` - Fired when server is not DOM-aware or operations fail
   - `DASOk` - Fired on successful HTTP operations
   - `DASError` - Fired on failed HTTP operations
   - `DASWebSocketAvailable` - Fired when WebSocket extension is loaded
   - `DASWebSocketConnected` - Fired when WebSocket connection established
   - `DASWebSocketDisconnected` - Fired when WebSocket connection closed
   - `DASStreamUpdate` - Fired when DOM update is applied from stream

### Key Concepts

- **Range Header**: Uses `Range: selector=<css-selector>` to identify target elements on the server
- **CSS Selector Generation**: Elements automatically generate their selector path for server communication
  - Prefers IDs when available for stability (returns `#id`)
  - Falls back to nearest parent with ID (e.g., `#container > div:nth-child(2)`)
  - Only uses full path when no IDs exist
- **Progressive Enhancement**: Library works with or without DOM-aware server support

### WebSocket Streaming Architecture

The WebSocket extension (`das-ws.mjs`) implements real-time DOM synchronization:

1. **Automatic Connection** - Connects to the same URL as the page (http:// → ws://)
2. **Microdata Protocol** - Expects updates as HTML with StreamItem microdata:
   ```html
   <div itemscope itemtype="http://rustybeam.net/StreamItem">
     <span itemprop="method">PUT</span>
     <span itemprop="selector">#todo-1</span>
     <div itemprop="content">
       <li id="todo-1" class="completed">Updated item</li>
     </div>
   </div>
   ```
3. **Local Change Tracking** - Prevents echo by tracking operations before they execute
4. **Smart Reconnection** - Exponential backoff from 1s to 30s max
5. **Debug Mode** - Set `window.DAS_WS_DEBUG = true` for verbose logging

## Development Commands

Since this is a vanilla JavaScript module with no build process:

```bash
# Run the test page locally
python3 -m http.server 8000
# Then open http://localhost:8000/test.html

# Or use any other static file server
npx serve .
```

## Testing

Currently uses test.html for manual testing. The test page:
- Loads the module
- Listens for DAS availability events
- Provides console feedback on DAS status

## Important Implementation Notes

1. **No Build Process**: This is a pure ES module - no transpilation or bundling required
2. **Browser-Only**: Requires DOM APIs and fetch - not compatible with Node.js
3. **Server Requirements**: For full functionality, requires a server that:
   - Responds to OPTIONS with `Accept-Ranges: selector` header
   - Understands Range headers with CSS selectors
   - Can process HTML/FormData payloads

## Design Philosophy

When making changes to this codebase, remember:

1. **Simplicity over complexity** - This is a primitive, foundational library. Keep it lean.
2. **Standards compliance** - Use existing web standards correctly rather than inventing new ones.
3. **Progressive enhancement** - The library should enhance capabilities without breaking basic HTML functionality.
4. **Security by design** - Never expose permissions or security logic in client code.

## Future Possibilities

This approach enables:
- **Collaborative editing** - Multiple users editing different elements simultaneously
- **Universal API clients** - One client can work with any DOM-aware website
- **AI-native interfaces** - LLMs can understand and manipulate semantic HTML
- **Document-as-database** - HTML pages become queryable, mutable data stores

The goal is to reunify the web - making every HTML document both human-readable AND a fully-functional API.