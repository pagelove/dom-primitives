/**
 * htmx-das.js - htmx-compatible API implemented using DOM-Aware Primitives
 * 
 * This provides htmx-style declarative attributes (hx-get, hx-post, etc.)
 * but uses DOM-Aware Primitives under the hood instead of traditional AJAX.
 */

class HTMXDas {
  constructor() {
    this.config = {
      defaultSwapStyle: 'innerHTML',
      defaultSwapDelay: 0,
      defaultSettleDelay: 20,
      indicatorClass: 'htmx-request'
    }
    
    // Check if DOM-Aware Primitives are available
    this.dasAvailable = false
    document.addEventListener('DASAvailable', () => {
      this.dasAvailable = true
      this.init()
    })
    
    document.addEventListener('DASUnavailable', () => {
      console.warn('DOM-Aware Server not available, htmx-das functionality limited')
    })
  }

  init() {
    // Process all elements with hx- attributes
    this.processElements(document.body)
    
    // Watch for new elements
    this.observeDOM()
  }

  processElements(root) {
    // Find all elements with hx- attributes
    const elements = root.querySelectorAll('[hx-get], [hx-post], [hx-put], [hx-delete], [hx-trigger]')
    
    elements.forEach(element => {
      this.processElement(element)
    })
  }

  processElement(element) {
    // Skip if already processed
    if (element._htmxDasProcessed) return
    element._htmxDasProcessed = true

    // Get all hx- attributes
    const config = this.parseAttributes(element)
    
    // Set up event listeners based on trigger
    const triggers = this.parseTrigger(config.trigger || this.getDefaultTrigger(element))
    
    triggers.forEach(trigger => {
      element.addEventListener(trigger.event, async (e) => {
        // Check conditions
        if (trigger.condition && !eval(trigger.condition)) return
        
        // Prevent default for forms and links
        if (element.tagName === 'FORM' || element.tagName === 'A') {
          e.preventDefault()
        }
        
        // Execute the appropriate HTTP method
        await this.executeRequest(element, config, trigger)
      })
    })
  }

  parseAttributes(element) {
    const config = {}
    
    // Get HTTP method and URL (we'll ignore URL since DAS doesn't use it)
    ;['get', 'post', 'put', 'delete'].forEach(method => {
      if (element.hasAttribute(`hx-${method}`)) {
        config.method = method.toUpperCase()
        config.url = element.getAttribute(`hx-${method}`)
      }
    })
    
    // Get other hx- attributes
    config.target = element.getAttribute('hx-target')
    config.swap = element.getAttribute('hx-swap') || this.config.defaultSwapStyle
    config.trigger = element.getAttribute('hx-trigger')
    config.indicator = element.getAttribute('hx-indicator')
    config.confirm = element.getAttribute('hx-confirm')
    config.select = element.getAttribute('hx-select')
    
    return config
  }

  parseTrigger(triggerStr) {
    if (!triggerStr) return [{ event: 'click' }]
    
    const triggers = []
    const parts = triggerStr.split(',')
    
    parts.forEach(part => {
      const [eventPart, ...modifiers] = part.trim().split(' ')
      const trigger = { event: eventPart }
      
      modifiers.forEach(modifier => {
        if (modifier.startsWith('delay:')) {
          trigger.delay = parseInt(modifier.substr(6))
        } else if (modifier === 'once') {
          trigger.once = true
        } else if (modifier.startsWith('[') && modifier.endsWith(']')) {
          trigger.condition = modifier.slice(1, -1)
        }
      })
      
      triggers.push(trigger)
    })
    
    return triggers
  }

  getDefaultTrigger(element) {
    if (element.tagName === 'FORM') return 'submit'
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') return 'change'
    return 'click'
  }

  async executeRequest(element, config, trigger) {
    // Show confirmation if needed
    if (config.confirm && !confirm(config.confirm)) return
    
    // Show loading indicator
    this.showIndicator(element, config)
    
    try {
      // Get the target element
      const target = this.getTarget(element, config)
      
      // Execute the appropriate DAS method
      let result
      switch (config.method) {
        case 'GET':
          await target.GET()
          break
          
        case 'POST':
          // For POST, we need to handle form data or element content
          if (element.tagName === 'FORM') {
            const formData = new FormData(element)
            const html = this.formDataToHTML(formData)
            await target.POST(html)
          } else {
            // For non-forms, POST appends the element's content
            await target.POST(element.outerHTML)
          }
          break
          
        case 'PUT':
          // PUT replaces the target with its current state
          await target.PUT()
          break
          
        case 'DELETE':
          await target.DELETE()
          break
      }
      
      // Handle the response based on swap strategy
      this.handleSwap(element, target, config)
      
    } catch (error) {
      console.error('htmx-das request failed:', error)
      element.dispatchEvent(new CustomEvent('htmx:error', { detail: error }))
    } finally {
      this.hideIndicator(element, config)
    }
  }

  getTarget(element, config) {
    if (!config.target) return element
    
    if (config.target === 'this') return element
    
    // Handle relative selectors
    if (config.target.startsWith('closest ')) {
      return element.closest(config.target.substr(8))
    }
    
    if (config.target.startsWith('find ')) {
      return element.querySelector(config.target.substr(5))
    }
    
    // Handle absolute selectors
    return document.querySelector(config.target)
  }

  handleSwap(element, target, config) {
    // Since DAS updates happen server-side, we might need to trigger a GET
    // to see the changes, depending on the swap style
    
    switch (config.swap) {
      case 'outerHTML':
        // Element was replaced entirely by server
        break
        
      case 'innerHTML':
        // Content was updated by server
        break
        
      case 'beforebegin':
      case 'afterbegin':
      case 'beforeend':
      case 'afterend':
        // These positions make sense for POST (append)
        break
        
      case 'delete':
        // Element should be removed (already done by DELETE)
        break
        
      case 'none':
        // No swap needed
        break
    }
    
    // Dispatch htmx-compatible events
    target.dispatchEvent(new Event('htmx:load'))
    target.dispatchEvent(new Event('htmx:afterSwap'))
  }

  showIndicator(element, config) {
    if (config.indicator) {
      const indicator = document.querySelector(config.indicator)
      if (indicator) {
        indicator.classList.add(this.config.indicatorClass)
      }
    } else {
      element.classList.add(this.config.indicatorClass)
    }
  }

  hideIndicator(element, config) {
    if (config.indicator) {
      const indicator = document.querySelector(config.indicator)
      if (indicator) {
        indicator.classList.remove(this.config.indicatorClass)
      }
    } else {
      element.classList.remove(this.config.indicatorClass)
    }
  }

  formDataToHTML(formData) {
    // Convert form data to HTML representation
    let html = '<div class="form-data">'
    for (const [key, value] of formData.entries()) {
      html += `<div class="field" data-name="${key}">${value}</div>`
    }
    html += '</div>'
    return html
  }

  observeDOM() {
    // Watch for dynamically added elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            this.processElements(node)
          }
        })
      })
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }
}

// Initialize htmx-das
const htmxDas = new HTMXDas()

// Expose global for compatibility
window.htmx = {
  // Minimal htmx-compatible API
  process: (element) => htmxDas.processElements(element),
  config: htmxDas.config,
  
  // Event system compatibility
  on: (event, selector, handler) => {
    document.addEventListener(event, (e) => {
      if (e.target.matches(selector)) {
        handler(e)
      }
    })
  },
  
  trigger: (element, event) => {
    element.dispatchEvent(new Event(event))
  }
}

// Also check if DAS is already available
if (document.documentElement.hasAttribute('data-das-available')) {
  htmxDas.dasAvailable = true
  htmxDas.init()
}