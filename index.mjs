window.location.server = { DASAware: false };

function htmlToNode(html) {
    try {
        const template = document.createElement("template");
        template.innerHTML = html;
        const nNodes = template.content.childNodes.length;
        if (nNodes !== 1) {
            throw new Error(
                `html parameter must represent a single node; got ${nNodes}. ` +
                "Note that leading or trailing spaces around an element in your " +
                'HTML, like " <img/> ", get parsed as text nodes neighbouring ' +
                "the element; call .trim() on your input to avoid this."
            );
        }
        return template.content.firstChild;
    } catch (error) {
        console.error('DOM-aware primitives: Failed to parse HTML:', error);
        throw error;
    }
}

function recreateResponse(html, response) {
    const newResponse = new Response(html, {
        status: response.status, // Keep original failure status
        statusText: response.statusText,
        headers: response.headers,
    });
    return newResponse;
}

Object.defineProperty(HTMLElement.prototype, "GET", {
    configurable: true,
    value: function() {
        return this;
    },
});

const notDOMAware = function() {
    const evt = new CustomEvent("DASUnavailable", { bubbles: true, detail: {} });
    this.dispatchEvent(evt);
};

Object.defineProperty(HTMLElement.prototype, "HEAD", {
    configurable: true,
    value: notDOMAware,
});

// POST is the HTTP equivalent of appendChild
Object.defineProperty(HTMLElement.prototype, "POST", {
    configurable: true,
    value: notDOMAware,
});

// PUT is the HTTP equivalent of replaceChild
Object.defineProperty(HTMLElement.prototype, "PUT", {
    configurable: true,
    value: notDOMAware,
});

Object.defineProperty(HTMLElement.prototype, "PATCH", {
    configurable: true,
    value: notDOMAware,
});

//
Object.defineProperty(HTMLElement.prototype, "DELETE", {
    configurable: true,
    value: notDOMAware,
});

Object.defineProperty(HTMLElement.prototype, "selector", {
    enumerable: false,
    get: function() {
        try {
            // If element has an ID, use it as the selector for stability
            if (this.id) {
                return `#${CSS.escape(this.id)}`;
            }

            // Otherwise, build a path from the nearest parent with an ID
            let el = this;
            let path = [];
            let parent;

            while ((parent = el.parentNode)) {
                // Check if parent is a valid element node
                if (parent.nodeType !== Node.ELEMENT_NODE && parent !== document) {
                    break;
                }
                
                // If parent has an ID, we can start our selector from there
                if (parent.id) {
                    const index = parent.children ? [].indexOf.call(parent.children, el) + 1 : 1;
                    path.unshift(
                        `#${CSS.escape(parent.id)} > ${el.tagName}:nth-child(${index})`
                    );
                    return path.join(" > ").toLowerCase();
                }

                const index = parent.children ? [].indexOf.call(parent.children, el) + 1 : 1;
                path.unshift(
                    `${el.tagName}:nth-child(${index})`
                );
                el = parent;
            }

            return `${path.join(" > ")}`.toLowerCase();
        } catch (error) {
            console.error('DOM-aware primitives: Failed to generate selector:', error);
            // Return a fallback selector
            return `${this.tagName || 'unknown'}`.toLowerCase();
        }
    },
});

/*
    If we are a DOM enabled web server then we can do stuff.
*/

const processResponse = (anElement, response) => {
    if (response.ok) {
        const evt = new CustomEvent("DASOk", {
            bubbles: true,
            detail: { element: anElement, response: response },
        });
        anElement.dispatchEvent(evt);
    } else {
        const evt = new CustomEvent("DASError", {
            bubbles: true,
            detail: { element: anElement, response: response },
        });
        anElement.dispatchEvent(evt);
    }
    return response;
};

document.addEventListener("DASAvailable", () => {
    // might as well return 'this'
    Object.defineProperty(HTMLElement.prototype, "GET", {
        value: async function() {
            try {
                const headers = new Headers();
                headers.set("Range", `selector=${this.selector}`);
                const response = await fetch(window.location, {
                    headers,
                    method: "GET",
                });
                return processResponse(this, response);
            } catch (error) {
                console.error('DOM-aware primitives: GET request failed:', error);
                const errorEvent = new CustomEvent("DASError", {
                    bubbles: true,
                    detail: { element: this, error: error, method: 'GET' },
                });
                this.dispatchEvent(errorEvent);
                throw error;
            }
        },
    });

    Object.defineProperty(HTMLElement.prototype, "HEAD", {
        value: async function() {
            try {
                const headers = new Headers();
                headers.set("Range", `selector=${this.selector}`);
                const response = await fetch(window.location, {
                    headers,
                    method: "HEAD",
                });
                return processResponse(this, response);
            } catch (error) {
                console.error('DOM-aware primitives: HEAD request failed:', error);
                const errorEvent = new CustomEvent("DASError", {
                    bubbles: true,
                    detail: { element: this, error: error, method: 'HEAD' },
                });
                this.dispatchEvent(errorEvent);
                throw error;
            }
        },
    });

    // POST is the HTTP equivalent of appendChild
    Object.defineProperty(HTMLElement.prototype, "POST", {
        value: async function( postData ) {
            try {
                if (postData === undefined || postData === null) {
                    throw new Error('POST requires data to be provided');
                }
                
                const headers = new Headers();
                headers.set("Range", `selector=${this.selector}`);
                headers.set("Content-Type", "text/html");
                const response = await fetch(window.location, {
                    headers,
                    body: postData,
                    method: "POST",
                });

                // If successful and server returns HTML, append it
                if (
                    response.ok &&
                    response.headers.get("Content-Type")?.includes("text/html")
                ) {
                    const responseHtml = await response.text();
                    if (responseHtml) {
                        try {
                            this.appendChild(htmlToNode(responseHtml));
                        } catch (domError) {
                            console.error('DOM-aware primitives: Failed to append response HTML:', domError);
                            throw domError;
                        }
                    }
                    return processResponse(this, recreateResponse(responseHtml, response));
                }

                return processResponse(this, response);
            } catch (error) {
                console.error('DOM-aware primitives: POST request failed:', error);
                const errorEvent = new CustomEvent("DASError", {
                    bubbles: true,
                    detail: { element: this, error: error, method: 'POST' },
                });
                this.dispatchEvent(errorEvent);
                throw error;
            }
        },
    });

    // PUT is the HTTP equivalent of replaceChild
    Object.defineProperty(HTMLElement.prototype, "PUT", {
        value: async function() {
            try {
                if (!this.parentNode) {
                    throw new Error('Element must have a parent to use PUT');
                }
                
                const headers = new Headers();
                headers.set("Range", `selector=${this.selector}`);
                headers.set("Content-Type", "text/html");
                const response = await fetch(window.location, {
                    headers,
                    body: this.outerHTML,
                    method: "PUT",
                });
                if (response.ok) {
                    if (response.headers.get("Content-Type")?.includes("text/html")) {
                        const responseHtml = await response.text();
                        if (responseHtml) {
                            try {
                                const newNode = htmlToNode(responseHtml);
                                this.parentNode.replaceChild(newNode, this);
                                return processResponse(
                                    newNode,
                                    recreateResponse(responseHtml, response)
                                );
                            } catch (domError) {
                                console.error('DOM-aware primitives: Failed to replace element:', domError);
                                throw domError;
                            }
                        }
                    }
                } else {
                    // Fallback: try to GET fresh content
                    try {
                        const getResponse = await this.GET();
                        if (getResponse.ok) {
                            const responseHtml = await getResponse.text();
                            if (responseHtml) {
                                const newNode = htmlToNode(responseHtml);
                                this.parentNode.replaceChild(newNode, this);
                                return processResponse(
                                    newNode,
                                    recreateResponse(responseHtml, response)
                                );
                            }
                        }
                    } catch (getError) {
                        console.error('DOM-aware primitives: PUT fallback GET failed:', getError);
                    }
                }
                return processResponse(this, response);
            } catch (error) {
                console.error('DOM-aware primitives: PUT request failed:', error);
                const errorEvent = new CustomEvent("DASError", {
                    bubbles: true,
                    detail: { element: this, error: error, method: 'PUT' },
                });
                this.dispatchEvent(errorEvent);
                throw error;
            }
        },
    });

    Object.defineProperty(HTMLElement.prototype, "PATCH", {
        value: async function(anEMR) {
            const headers = new Headers();
            headers.set("Content-Type", "application/json");
            const response = await fetch(window.location, {
                method: "PATCH",
                headers: headers,
                body: JSON.stringify(anEMR),
            });
            return processResponse(this, response);
        },
    });

    Object.defineProperty(HTMLElement.prototype, "DELETE", {
        value: async function() {
            try {
                const headers = new Headers();
                headers.set("Range", `selector=${this.selector}`);
                const response = await fetch(window.location, {
                    headers,
                    method: "DELETE",
                });
                if (response.ok) {
                    try {
                        this.remove();
                    } catch (domError) {
                        console.error('DOM-aware primitives: Failed to remove element from DOM:', domError);
                        // Don't throw here as the server operation succeeded
                    }
                }
                return processResponse(this, response);
            } catch (error) {
                console.error('DOM-aware primitives: DELETE request failed:', error);
                const errorEvent = new CustomEvent("DASError", {
                    bubbles: true,
                    detail: { element: this, error: error, method: 'DELETE' },
                });
                this.dispatchEvent(errorEvent);
                throw error;
            }
        },
    });
});

// Check for DOM-aware server
try {
    const optionsRequest = await fetch(window.location, {
        method: "OPTIONS",
    });

    if (optionsRequest.ok) {
        const acceptRanges = optionsRequest.headers.get("Accept-Ranges");
        window.location.server.DASAware = !!(acceptRanges && acceptRanges.match(/selector/));
    } else {
        console.warn('DOM-aware primitives: OPTIONS request returned non-OK status:', optionsRequest.status);
        window.location.server.DASAware = false;
    }
} catch (error) {
    console.error('DOM-aware primitives: Failed to check server capabilities:', error);
    window.location.server.DASAware = false;
}

if (window.location.server.DASAware) {
    const evt = new CustomEvent("DASAvailable", { bubbles: true, detail: {} });
    document.dispatchEvent(evt);
} else {
    const evt = new CustomEvent("DASUnavailable", { bubbles: true, detail: {} });
    document.dispatchEvent(evt);
}

/*
    http-can WebComponent
    A custom element that conditionally shows content based on HTTP method permissions
*/

class HttpCan extends HTMLElement {
    // Static cache for OPTIONS responses
    // Key format: "METHOD1,METHOD2:selector" -> { allowed: Set<string>, timestamp: number }
    static cache = new Map();
    
    // Default cache TTL in seconds
    static DEFAULT_CACHE_TTL = 300; // 5 minutes
    
    // Observe these attributes for changes
    static get observedAttributes() {
        return ['method', 'selector', 'cache-ttl', 'href'];
    }
    
    constructor() {
        super();
        
        // Create shadow DOM
        this.attachShadow({ mode: 'open' });
        
        // Create slot for content (hidden by default)
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: contents;
                }
                #content {
                    display: none;
                }
                #content.allowed {
                    display: contents;
                }
                #loading {
                    display: none;
                }
                #loading.active {
                    display: inline-block;
                }
            </style>
            <div id="loading" part="loading">
                <slot name="loading"><!-- Optional loading content --></slot>
            </div>
            <div id="content" part="content">
                <slot></slot>
            </div>
        `;
        
        this.contentDiv = this.shadowRoot.getElementById('content');
        this.loadingDiv = this.shadowRoot.getElementById('loading');
        this.checkInProgress = false;
    }
    
    connectedCallback() {
        // Check permissions when element is added to DOM
        this.checkPermissions();
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        // Re-check permissions when relevant attributes change
        if (oldValue !== newValue && (name === 'method' || name === 'selector' || name === 'href')) {
            this.checkPermissions();
        }
    }
    
    async checkPermissions() {
        const method = this.getAttribute('method') || 'GET';  // Default to GET if not specified
        const selector = this.getAttribute('selector');
        const href = this.getAttribute('href');
        
        // At least one of selector or href is required
        if (!selector && !href) {
            this.hideContent();
            return;
        }
        
        // Prevent concurrent checks
        if (this.checkInProgress) {
            return;
        }
        
        this.checkInProgress = true;
        this.showLoading();
        
        try {
            // Get list of methods to check (comma-separated, case-insensitive)
            const methodsToCheck = method.toLowerCase().split(',').map(m => m.trim().toUpperCase());
            
            // Generate cache key based on methods and either selector or href
            const targetKey = href || selector;
            const cacheKey = this.getCacheKey(methodsToCheck, targetKey, href ? 'href' : 'selector');
            const cachedResult = this.getCachedResult(cacheKey);
            
            let allowedMethods;
            
            if (cachedResult) {
                allowedMethods = cachedResult;
            } else {
                // Make OPTIONS request
                if (window.HTTP_CAN_DEBUG) {
                    console.log('http-can: Making OPTIONS request', { selector, href, url: href || window.location.href });
                }
                allowedMethods = await this.fetchAllowedMethods(selector, href);
                
                // Cache the result
                this.setCachedResult(cacheKey, allowedMethods);
            }
            
            // Check if ALL requested methods are allowed (AND logic)
            const allMethodsAllowed = methodsToCheck.every(m => allowedMethods.has(m));
            
            if (allMethodsAllowed) {
                this.showContent();
                this.dispatchEvent(new CustomEvent('http-can-allowed', {
                    bubbles: true,
                    detail: { methods: methodsToCheck, selector, href }
                }));
            } else {
                this.hideContent();
                this.dispatchEvent(new CustomEvent('http-can-denied', {
                    bubbles: true,
                    detail: { 
                        requested: methodsToCheck, 
                        allowed: Array.from(allowedMethods),
                        selector,
                        href
                    }
                }));
            }
            
        } catch (error) {
            // On error, hide content (fail-closed)
            this.hideContent();
            this.dispatchEvent(new CustomEvent('http-can-error', {
                bubbles: true,
                detail: { error: error.message, selector, href }
            }));
        } finally {
            this.hideLoading();
            this.checkInProgress = false;
        }
    }
    
    async fetchAllowedMethods(selector, href) {
        const headers = new Headers();
        
        // Always set Range header if selector is provided
        if (selector) {
            headers.set('Range', `selector=${selector}`);
        }
        
        // Use href parameter when provided, otherwise use current page
        const url = href || window.location.href;
        
        try {
            const response = await fetch(url, {
                method: 'OPTIONS',
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error(`OPTIONS request failed with status ${response.status}`);
            }
            
            // Parse Allow header
            const allowHeader = response.headers.get('Allow');
            if (!allowHeader) {
                return new Set();
            }
            
            // Split by comma and normalize
            const methods = allowHeader.split(',')
                .map(m => m.trim().toUpperCase())
                .filter(m => m.length > 0);
            
            return new Set(methods);
            
        } catch (error) {
            console.error('http-can: Failed to fetch permissions:', error);
            throw error;
        }
    }
    
    getCacheKey(methods, target, type = 'selector') {
        // Normalize methods array to consistent string
        const methodStr = methods.sort().join(',');
        return `${methodStr}:${type}:${target}`;
    }
    
    getCachedResult(cacheKey) {
        const cached = HttpCan.cache.get(cacheKey);
        if (!cached) return null;
        
        const ttl = parseInt(this.getAttribute('cache-ttl') || HttpCan.DEFAULT_CACHE_TTL) * 1000;
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - cached.timestamp > ttl) {
            HttpCan.cache.delete(cacheKey);
            return null;
        }
        
        return cached.allowed;
    }
    
    setCachedResult(cacheKey, allowedMethods) {
        HttpCan.cache.set(cacheKey, {
            allowed: allowedMethods,
            timestamp: Date.now()
        });
    }
    
    showContent() {
        this.contentDiv.classList.add('allowed');
    }
    
    hideContent() {
        this.contentDiv.classList.remove('allowed');
    }
    
    showLoading() {
        this.loadingDiv.classList.add('active');
    }
    
    hideLoading() {
        this.loadingDiv.classList.remove('active');
    }
}

// Register the custom element
customElements.define('http-can', HttpCan);