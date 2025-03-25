window.location.server = { DASAware: false }

Object.defineProperty(HTMLElement.prototype, "GET", {
    configurable: true,
    value: function() {
        return this;
    }
});

const notDOMAware = function() {
    const evt = new CustomEvent("DASUnavailable", { bubbles: true, detail: {} })
    this.dispatchEvent(evt);        
}

Object.defineProperty(HTMLElement.prototype, 'HEAD', {
    configurable: true,
    value: notDOMAware
});

// POST is the HTTP equivalent of appendChild
Object.defineProperty(HTMLElement.prototype, "POST", {
    configurable: true,
    value: notDOMAware
})

// PUT is the HTTP equivalent of replaceChild
Object.defineProperty(HTMLElement.prototype, "PUT", {
    configurable: true,
    value: notDOMAware
});

Object.defineProperty(HTMLElement.prototype, "PATCH", {
    configurable: true,
    value: notDOMAware
});

// 
Object.defineProperty(HTMLElement.prototype, "DELETE", {
    configurable: true,
    value: notDOMAware
});

const optionsRequest = await fetch(window.location, {
    method: "OPTIONS",    
});

if ( optionsRequest.ok ) {
    window.location.server.DASAware = !!optionsRequest.headers.get('Accept-Ranges').match(/selector/);
}

if (window.location.server.DASAware) {
    const evt = new CustomEvent("DASAvailable", { bubbles: true, detail: { }})
    document.dispatchEvent(evt);
} else {
    const evt = new CustomEvent("DASUnavailable", { bubbles: true, detail: { }});
    document.dispatchEvent(evt);            
}

Object.defineProperty(HTMLElement.prototype, 'selector', {
    enumerable: false,
    get: function() {
        let el = this;
        let path = [], parent;
        while (parent = el.parentNode) {
            path.unshift(`${el.tagName}:nth-child(${[].indexOf.call(parent.children, el)+1})`);
            el = parent;
        }
        return `${path.join(' > ')}`.toLowerCase();        
    }
});

/*
    If we are a DOM enabled web server then we can do stuff.
*/

const processResponse = ( anElement, response ) => {
    if ( response.ok ) {
        const evt = new CustomEvent("DASOk", { bubbles: true, detail: { element: anElement, response: response }})
        anElement.dispatchEvent(evt);
    } else {
        const evt = new CustomEvent("DASError", { bubbles: true, detail: { element: anElement, response: response }})
        anElement.dispatchEvent(evt);
    }
    return response;
}

// might as well return 'this'
Object.defineProperty(HTMLElement.prototype, "GET", {
    value: function() {
        return this;
    }
});

Object.defineProperty(HTMLElement.prototype, "HEAD", {
    value: async function() {
        const headers = new Headers();
        headers.set('Range', `selector=${this.selector}`);
        const response = await fetch(window.location, {
            headers,
            method: 'HEAD'
        });
        return processResponse( this, response )
    }
});

// POST is the HTTP equivalent of appendChild
Object.defineProperty(HTMLElement.prototype, "POST", {
    value: async function() {
        const headers = new Headers();
        headers.set("Range", `selector=${this.parentNode.selector}`);
        headers.set("Content-Type", "text/html");
        const response = await fetch(window.location, {
            headers,
            body: this.outerHTML,
            method: POST
        });
        return processResponse( this, response );
    }
})

// PUT is the HTTP equivalent of replaceChild
Object.defineProperty(HTMLElement.prototype, "PUT", {
    value: async function() {
        const headers = new Headers();
        headers.set("Range", `selector=${this.selector}`);
        headers.set("Content-Type", "text/html");
        const response = await fetch(window.location, {
            headers,
            body  : this.outerHTML,
            method: 'PUT'
        })
        return processResponse( this, response );
    }
});

Object.defineProperty(HTMLElement.prototype, "PATCH", {
    value: async function( anEMR ) {
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        const response = await fetch(window.location, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify( anEMR )
        });
        return processResponse( this, response );
    }
});

Object.defineProperty(HTMLElement.prototype, "DELETE", {
    value: async function() {
        const headers = new Headers();
        headers.set("Range", `selector=${this.selector}`);
        const response = await fetch(window.location, {
            headers,
            method: 'DELETE'
        });
        return processResponse( this, response );
    }
});
