window.location.server = { DASAware: false };

function htmlToNode(html) {
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
        // If element has an ID, use it as the selector for stability
        if (this.id) {
            return `#${this.id}`;
        }

        // Otherwise, build a path from the nearest parent with an ID
        let el = this;
        let path = [];
        let parent;

        while ((parent = el.parentNode)) {
            // If parent has an ID, we can start our selector from there
            if (parent.id) {
                path.unshift(
                    `#${parent.id} > ${el.tagName}:nth-child(${
            [].indexOf.call(parent.children, el) + 1
          })`
                );
                return path.join(" > ").toLowerCase();
            }

            path.unshift(
                `${el.tagName}:nth-child(${[].indexOf.call(parent.children, el) + 1})`
            );
            el = parent;
        }

        return `${path.join(" > ")}`.toLowerCase();
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
            const headers = new Headers();
            headers.set("Range", `selector=${this.selector}`);
            const response = await fetch(window.location, {
                headers,
                method: "GET",
            });
            return processResponse(this, response);
        },
    });

    Object.defineProperty(HTMLElement.prototype, "HEAD", {
        value: async function() {
            const headers = new Headers();
            headers.set("Range", `selector=${this.selector}`);
            const response = await fetch(window.location, {
                headers,
                method: "HEAD",
            });
            return processResponse(this, response);
        },
    });

    // POST is the HTTP equivalent of appendChild
    Object.defineProperty(HTMLElement.prototype, "POST", {
        value: async function( postData ) {
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
                    this.appendChild(htmlToNode(responseHtml));
                }
                return processResponse(this, recreateResponse(responseHtml, response));
            }

            return processResponse(this, response);
        },
    });

    // PUT is the HTTP equivalent of replaceChild
    Object.defineProperty(HTMLElement.prototype, "PUT", {
        value: async function() {
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
                        const newNode = htmlToNode(responseHtml);
                        this.parentNode.replaceChild(newNode, this);
                        return processResponse(
                            newNode,
                            recreateResponse(responseHtml, response)
                        );
                    }
                }
            } else {
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
            }
            return processResponse(this, response);
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
            const headers = new Headers();
            headers.set("Range", `selector=${this.selector}`);
            const response = await fetch(window.location, {
                headers,
                method: "DELETE",
            });
            if ( response.ok ) {
                this.remove()
            }
            return processResponse(this, response);
        },
    });
});

const optionsRequest = await fetch(window.location, {
    method: "OPTIONS",
});

if (optionsRequest.ok) {
    window.location.server.DASAware = !!optionsRequest.headers
        .get("Accept-Ranges")
        .match(/selector/);
}

if (window.location.server.DASAware) {
    const evt = new CustomEvent("DASAvailable", { bubbles: true, detail: {} });
    document.dispatchEvent(evt);
} else {
    const evt = new CustomEvent("DASUnavailable", { bubbles: true, detail: {} });
    document.dispatchEvent(evt);
}