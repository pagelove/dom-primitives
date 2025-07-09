# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-09

### Added
- Core DOM-aware primitives library (`index.mjs`)
  - HTTP-style methods (GET, HEAD, POST, PUT, DELETE) on all HTML elements
  - Automatic DOM-aware server detection via OPTIONS request
  - CSS selector generation for element identification
  - Event system (DASAvailable, DASUnavailable, DASOk, DASError)
  - Progressive enhancement - works with or without DOM-aware servers
  
- WebSocket streaming extension (`das-ws.mjs`)
  - Real-time DOM synchronization via WebSocket
  - Automatic subscription to current page
  - Microdata-based update protocol
  - Local change tracking to prevent echo effects
  - Automatic reconnection with exponential backoff
  - SUBSCRIBE method on Document and HTMLElement prototypes
  - Debug mode for troubleshooting

### Architecture Highlights
- Zero dependencies
- No build process required
- Pure ES modules
- Browser-only (requires DOM APIs)
- Implements true REST/HATEOAS principles with HTML as hypermedia

### Known Limitations
- PATCH method is implemented but not fully functional
- Requires DOM-aware server for full functionality
- WebSocket path must match HTTP path on server

[1.0.0]: https://github.com/jamesaduncan/dom-aware-primitives/releases/tag/v1.0.0