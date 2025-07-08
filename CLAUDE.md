# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a client-side JavaScript library that adds HTTP-style methods (GET, HEAD, POST, PUT, PATCH, DELETE) to HTML elements for communicating with DOM-aware servers (DAS). The library extends HTMLElement.prototype to enable direct HTTP operations on DOM elements.

## Architecture

### Core Components

1. **index.mjs** - Main library file that:
   - Detects if the server is DOM-aware via OPTIONS request checking for 'Accept-Ranges: selector' header
   - Extends HTMLElement.prototype with HTTP methods
   - Provides two modes of operation:
     - DAS-aware mode: Full HTTP operations using CSS selectors
     - Non-DAS mode: Methods dispatch 'DASUnavailable' events

2. **Element Selector Generation** - Custom `selector` property that generates unique CSS selectors for any element

3. **Event System**:
   - `DASAvailable` - Fired when DOM-aware server is detected
   - `DASUnavailable` - Fired when server is not DOM-aware or operations fail
   - `DASOk` - Fired on successful HTTP operations
   - `DASError` - Fired on failed HTTP operations

### Key Concepts

- **Range Header**: Uses `Range: selector=<css-selector>` to identify target elements on the server
- **CSS Selector Generation**: Elements automatically generate their selector path for server communication
- **Progressive Enhancement**: Library works with or without DOM-aware server support

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