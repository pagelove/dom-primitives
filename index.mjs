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