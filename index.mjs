const optionsRequest = fetch(window.location, {
    method: "OPTIONS",    
});

const serverDetail = {}
Object.defineProperty(serverDetail, "DOMAware", {
    get: async function() {
        let result = await optionsRequest;
        return !!result.headers.get('Accept-Ranges').match(/selector/)
    }
})
Object.defineProperty( window.location, "server", {
    value: serverDetail
});

const { DOMAware } = await window.location.server;

/*
    If we are a DOM enabled web server then we can do stuff.
*/
if (DOMAware) {
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

    // might as well return 'this'
    Object.defineProperty(HTMLElement.prototype, "GET", {
        value: function() {
            return this;
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
            return response;
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
            return response;
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
            return response;
        }
    });

    // 
    Object.defineProperty(HTMLElement.prototype, "DELETE", {
        value: async function() {
            const headers = new Headers();
            headers.set("Range", `selector=${this.selector}`);
            const response = await fetch(window.location, {
                headers,
                method: 'DELETE'
            })
            return response;
        }
    });
} else {
    Object.defineProperty(window.location, 'server', {
        value: {
            'DOMAware': false
        }
    });
}

