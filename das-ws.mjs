// DOM-Aware WebSocket streaming extension
// Requires dom-aware-primitives to be loaded first

// Wait for DAS availability before extending
document.addEventListener("DASAvailable", () => {
    
    // Track local changes to prevent re-application from WebSocket
    const localChanges = new Map(); // selector -> { timestamp, method, content }
    const CHANGE_TIMEOUT = 5000; // 5 seconds to consider a change "local"
    
    // Clean up old local changes periodically
    setInterval(() => {
        const now = Date.now();
        for (const [selector, change] of localChanges.entries()) {
            if (now - change.timestamp > CHANGE_TIMEOUT) {
                localChanges.delete(selector);
            }
        }
    }, CHANGE_TIMEOUT);
    
    // Convert current URL to WebSocket URL
    function getWebSocketUrl() {
        const wsUrl = new URL(window.location);
        wsUrl.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return wsUrl.toString();
    }
    
    // Parse microdata from StreamItem
    function parseStreamItem(itemElement) {
        const method = itemElement.querySelector('[itemprop="method"]')?.textContent;
        const url = itemElement.querySelector('[itemprop="url"]')?.textContent;
        const selector = itemElement.querySelector('[itemprop="selector"]')?.textContent;
        const contentElement = itemElement.querySelector('[itemprop="content"]');
        const content = contentElement?.innerHTML;
        
        return { method, url, selector, content };
    }
    
    // Apply update to DOM based on method
    function applyUpdate(update) {
        if (!update.selector) return false;
        
        // Check if this change was made locally recently
        const localChange = localChanges.get(update.selector);
        if (localChange && 
            localChange.method === update.method?.toUpperCase() &&
            Date.now() - localChange.timestamp < CHANGE_TIMEOUT) {
            console.log('Ignoring local change echoed from WebSocket:', update.selector);
            return false;
        }
        
        const target = document.querySelector(update.selector);
        if (!target) return false;
        
        switch(update.method?.toUpperCase()) {
            case 'PUT':
                if (update.content) {
                    // Create a temporary container to parse the content
                    const temp = document.createElement('div');
                    temp.innerHTML = update.content;
                    const newElement = temp.firstElementChild;
                    if (newElement) {
                        target.parentNode.replaceChild(newElement, target);
                        return { action: 'replaced', element: newElement };
                    }
                }
                break;
                
            case 'POST':
                if (update.content) {
                    // Parse content into DOM nodes
                    const temp = document.createElement('div');
                    temp.innerHTML = update.content;
                    // Append all child nodes
                    while (temp.firstChild) {
                        target.appendChild(temp.firstChild);
                    }
                    return { action: 'appended', element: target };
                }
                break;
                
            case 'DELETE':
                target.remove();
                return { action: 'deleted', selector: update.selector };
        }
        
        return false;
    }
    
    // Main subscription method on Document
    Object.defineProperty(Document.prototype, "SUBSCRIBE", {
        configurable: true,
        value: function(options = {}) {
            const { 
                onUpdate = null,
                onError = null,
                onConnect = null,
                onDisconnect = null,
                reconnect = true,
                reconnectDelay = 1000,
                maxReconnectDelay = 30000
            } = options;
            
            let ws = null;
            let reconnectTimeout = null;
            let currentReconnectDelay = reconnectDelay;
            let isIntentionallyClosed = false;
            
            function connect() {
                try {
                    ws = new WebSocket(getWebSocketUrl());
                    
                    ws.onopen = () => {
                        console.log('DAS WebSocket connected');
                        currentReconnectDelay = reconnectDelay; // Reset delay on successful connection
                        
                        // Dispatch custom event
                        const evt = new CustomEvent("DASWebSocketConnected", { 
                            bubbles: true, 
                            detail: { websocket: ws }
                        });
                        document.dispatchEvent(evt);
                        
                        onConnect?.(ws);
                    };
                    
                    ws.onmessage = (event) => {
                        try {
                            // Parse the streamed HTML
                            const parser = new DOMParser();
                            const fragment = parser.parseFromString(event.data, 'text/html');
                            
                            // Find all StreamItem updates
                            const streamItems = fragment.querySelectorAll('[itemtype="http://rustybeam.net/StreamItem"]');
                            
                            streamItems.forEach(itemElement => {
                                const update = parseStreamItem(itemElement);
                                const result = applyUpdate(update);
                                
                                if (result) {
                                    // Dispatch custom event for successful update
                                    const evt = new CustomEvent("DASStreamUpdate", {
                                        bubbles: true,
                                        detail: { update, result }
                                    });
                                    document.dispatchEvent(evt);
                                    
                                    onUpdate?.(update, result);
                                }
                            });
                        } catch (error) {
                            console.error('Error processing WebSocket message:', error);
                            onError?.(error);
                        }
                    };
                    
                    ws.onerror = (error) => {
                        console.error('DAS WebSocket error:', error);
                        onError?.(error);
                    };
                    
                    ws.onclose = () => {
                        console.log('DAS WebSocket disconnected');
                        
                        // Dispatch custom event
                        const evt = new CustomEvent("DASWebSocketDisconnected", { 
                            bubbles: true 
                        });
                        document.dispatchEvent(evt);
                        
                        onDisconnect?.();
                        
                        // Attempt to reconnect if not intentionally closed
                        if (reconnect && !isIntentionallyClosed) {
                            reconnectTimeout = setTimeout(() => {
                                console.log(`Attempting to reconnect in ${currentReconnectDelay}ms...`);
                                connect();
                                // Exponential backoff
                                currentReconnectDelay = Math.min(currentReconnectDelay * 2, maxReconnectDelay);
                            }, currentReconnectDelay);
                        }
                    };
                    
                } catch (error) {
                    console.error('Failed to create WebSocket:', error);
                    onError?.(error);
                }
            }
            
            // Start connection
            connect();
            
            // Return control object
            return {
                get readyState() {
                    return ws?.readyState;
                },
                
                close() {
                    isIntentionallyClosed = true;
                    if (reconnectTimeout) {
                        clearTimeout(reconnectTimeout);
                    }
                    ws?.close();
                },
                
                reconnect() {
                    isIntentionallyClosed = false;
                    this.close();
                    connect();
                },
                
                send(data) {
                    if (ws?.readyState === WebSocket.OPEN) {
                        ws.send(data);
                    } else {
                        throw new Error('WebSocket is not connected');
                    }
                }
            };
        }
    });
    
    // Also add SUBSCRIBE to HTMLElement for element-specific subscriptions
    Object.defineProperty(HTMLElement.prototype, "SUBSCRIBE", {
        configurable: true,
        value: function(options = {}) {
            // Subscribe to document but filter for this element's selector
            const elementSelector = this.selector;
            const originalOnUpdate = options.onUpdate;
            
            return document.SUBSCRIBE({
                ...options,
                onUpdate: (update, result) => {
                    // Only call the callback if this update affects our element
                    if (update.selector === elementSelector) {
                        originalOnUpdate?.(update, result);
                    }
                }
            });
        }
    });
    
    // Listen for local DAS operations to track them
    document.addEventListener('DASOk', (event) => {
        const { selector, method, content } = event.detail || {};
        if (selector && method) {
            localChanges.set(selector, {
                timestamp: Date.now(),
                method: method.toUpperCase(),
                content: content || null
            });
            console.log('Tracked local change:', { selector, method });
        }
    });
    
    // Dispatch event to signal WebSocket extension is ready
    const evt = new CustomEvent("DASWebSocketAvailable", { 
        bubbles: true, 
        detail: {} 
    });
    document.dispatchEvent(evt);
    
    // Automatically subscribe to the current page
    try {
        document.SUBSCRIBE({
            onUpdate: (update, result) => {
                console.log('Auto-subscription update:', update, result);
            },
            onError: (error) => {
                console.error('Auto-subscription error:', error);
            },
            onConnect: () => {
                console.log('Auto-subscription connected');
            },
            onDisconnect: () => {
                console.log('Auto-subscription disconnected');
            }
        });
    } catch (error) {
        console.error('Failed to auto-subscribe:', error);
    }
});

// If DAS is not available, provide stub implementations
document.addEventListener("DASUnavailable", () => {
    const notAvailable = function() {
        console.warn('DAS WebSocket not available - server is not DOM-aware');
        return null;
    };
    
    Object.defineProperty(Document.prototype, "SUBSCRIBE", {
        configurable: true,
        value: notAvailable
    });
    
    Object.defineProperty(HTMLElement.prototype, "SUBSCRIBE", {
        configurable: true,
        value: notAvailable
    });
});