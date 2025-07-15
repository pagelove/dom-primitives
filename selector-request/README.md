# Selector-Request Parser

A JavaScript module for parsing URLs with embedded CSS selectors using the `#(selector=...)` syntax.

## Installation

```javascript
import { parseSelectorRequest, parseAndResolve } from './selector-request/index.mjs';
```

## API

### `parseSelectorRequest(target)`

Parses a target string and extracts the href and selector components.

**Parameters:**
- `target` (string): The target string to parse

**Returns:**
- `{ href: string|null, selector: string|null }`

**Examples:**

```javascript
parseSelectorRequest('/api/users')
// { href: '/api/users', selector: null }

parseSelectorRequest('#(selector=p)')
// { href: null, selector: 'p' }

parseSelectorRequest('http://example.com/page#(selector=#main)')
// { href: 'http://example.com/page', selector: '#main' }

parseSelectorRequest('#(selector=tr:nth-child(15))')
// { href: null, selector: 'tr:nth-child(15)' }
```

### `resolveHref(href, base)`

Resolves relative URLs to absolute URLs.

**Parameters:**
- `href` (string): The href to resolve
- `base` (string): The base URL (defaults to `window.location.href`)

**Returns:**
- Absolute URL string

### `parseAndResolve(target, base)`

Combines parsing and URL resolution. If only a selector is provided, it defaults the href to the current page.

**Parameters:**
- `target` (string): The target string to parse
- `base` (string): The base URL for resolution (defaults to `window.location.href`)

**Returns:**
- `{ href: string|null, selector: string|null }` with resolved URLs

## Syntax

The module supports the following patterns:

- `/path` - Just a path, no selector
- `http://example.com/path` - Absolute URL, no selector
- `#(selector=.className)` - Just a selector, no path (href will be null or current page)
- `http://example.com/path#(selector=#id)` - URL with selector

## Handling Complex Selectors

The parser correctly handles CSS selectors with nested parentheses:

```javascript
// Pseudo-classes with parentheses
parseSelectorRequest('#(selector=li:nth-child(2n+1))')
parseSelectorRequest('#(selector=div:has(> p))')
parseSelectorRequest('#(selector=input:not([type="submit"]))')

// Multiple levels of nesting
parseSelectorRequest('#(selector=.list > li:nth-of-type(3n):has(a[href*="example"]))')
```

## Error Handling

- Returns `{ href: null, selector: null }` for null/undefined input
- Treats malformed selector syntax (unmatched parentheses) as plain href
- Logs warnings for malformed selectors