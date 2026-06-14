// Chat Widget JavaScript (Works both locally and as embed)
let cachedCsrfToken = null;
let apiOrigin = null; // This will hold the API origin (e.g., https://your-render-domain.com)

async function getCsrfToken() {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }
  try {
    const response = await fetch(`${apiOrigin}/api/csrf-token`, { credentials: 'include' });
    const data = await response.json();
    if (data.success && data.csrfToken) {
      cachedCsrfToken = data.csrfToken;
      return cachedCsrfToken;
    }
    return null;
  } catch (error) {
    return null;
  }
}

class AICSChatWidget {
    constructor(options = {}) {
        this.businessId = options.businessId || null;
        // Get API origin from script src
        const scriptTags = document.querySelectorAll('script[data-business-id]');
        const scriptTag = scriptTags[scriptTags.length - 1];
        apiOrigin = scriptTag ? new URL(scriptTag.src).origin : window.location.origin;
        
        // Inject widget stylesheet dynamically
        if (!document.getElementById('aics-widget-styles')) {
            const cssLink = document.createElement('link');
            cssLink.id = 'aics-widget-styles';
            cssLink.rel = 'stylesheet';
            cssLink.href = `${apiOrigin}/css/chat-widget.css`;
            document.head.appendChild(cssLink);
        }

        this.widgetSettings = {
        title: 'AI Support',
        primaryColor: '#667eea',
        avatar: '🤖'
    };
    this.showingLeadForm = false;
    this.conversationId = null;
    this.visitor = {};
    this.justSubmittedLeadForm = false;
    this.lastLeadFormMessage = '';
    this.triggers = [];
    this.triggerFired = {};
    this.init();
    }

    getStorageKey() {
        return `aics_conversation_${this.businessId}`;
    }

    async init() {
        // Load widget settings and triggers if business ID is provided
        if (this.businessId) {
            await Promise.all([this.loadWidgetSettings(), this.loadTriggers()]);
            // Try to load existing conversation from localStorage
            const savedConversationId = localStorage.getItem(this.getStorageKey());
            if (savedConversationId) {
                this.conversationId = savedConversationId;
                await this.loadConversationHistory();
            }
        }
        
        this.createWidget();
        this.attachEventListeners();
        this.setupTriggers();
        
        // Connect to Socket.IO for live visitor tracking
        this.loadSocketIo();
    }

    async loadConversationHistory() {
        try {
            const response = await fetch(`${apiOrigin}/api/businesses/${this.businessId}/conversations/${this.conversationId}`);
            const data = await response.json();

            if (data.success && data.conversation) {
                // Clear default welcome message
                this.messagesContainer.innerHTML = '';
                // Render all messages from history
                if (data.conversation.messages && data.conversation.messages.length > 0) {
                    data.conversation.messages.forEach(msg => {
                        if (msg.file) {
                            // If there's a file, pass the whole file object
                            this.addMessage(msg.file, msg.role);
                        } else {
                            // Otherwise, just pass the text
                            this.addMessage(msg.content, msg.role);
                        }
                    });
                }
                // Load visitor data if available
                if (data.conversation.visitor) {
                    this.visitor = data.conversation.visitor;
                }
            }
        } catch (error) {
            console.error('Error loading conversation history:', error);
        }
    }

    async loadWidgetSettings() {
        try {
            const response = await fetch(`${apiOrigin}/api/businesses/${this.businessId}/widget`);
            const data = await response.json();
            
            if (data.success && data.settings) {
                this.widgetSettings = { ...this.widgetSettings, ...data.settings };
            }
        } catch (error) {
            // Error log removed
        }
    }

    async loadTriggers() {
        try {
            const response = await fetch(`${apiOrigin}/api/businesses/${this.businessId}/triggers`);
            const data = await response.json();
            if (data.success && data.triggers) {
                this.triggers = data.triggers;
            }
        } catch (error) {
            console.error('Error loading triggers:', error);
        }
    }

    setupTriggers() {
        // Track time on page
        this.startTime = Date.now();
        this.timeInterval = setInterval(() => this.checkTimeTriggers(), 1000);
        // Track scroll depth
        window.addEventListener('scroll', () => this.checkScrollTriggers());
        // Track keyword triggers immediately and on navigation changes
        setTimeout(() => this.checkKeywordTriggers(), 500);
        window.addEventListener('popstate', () => this.checkKeywordTriggers());
    }

    loadSocketIo() {
        if (typeof io === 'undefined') {
            const socketScript = document.createElement('script');
            socketScript.src = `${apiOrigin}/socket.io/socket.io.js`;
            socketScript.onload = () => this.initSocket();
            document.head.appendChild(socketScript);
        } else {
            this.initSocket();
        }
    }

    initSocket() {
        if (typeof io === 'undefined') return;
        
        console.log('[WIDGET] Connecting to Socket.IO...');
        this.socket = io(apiOrigin);
        
        this.socket.on('connect', () => {
            console.log('[WIDGET] Socket.IO connected. ID:', this.socket.id);
            this.sendVisitorActiveHeartbeat();
            
            // Start heartbeat interval
            this.heartbeatInterval = setInterval(() => {
                this.sendVisitorActiveHeartbeat();
            }, 10000); // every 10 seconds
        });
        
        this.socket.on('disconnect', () => {
            console.log('[WIDGET] Socket.IO disconnected');
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
        });
    }
    
    sendVisitorActiveHeartbeat() {
        if (!this.socket || !this.socket.connected) return;
        
        this.socket.emit('visitor-active', {
            businessId: this.businessId,
            url: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
            userAgent: navigator.userAgent
        });
    }

    checkTimeTriggers() {
        const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        this.triggers.filter(t => t.enabled && t.type === 'time_on_page' && !this.triggerFired[t.id]).forEach(t => {
            if (elapsedSeconds >= (t.conditions?.seconds || 0)) {
                this.fireTrigger(t);
            }
        });
    }

    checkScrollTriggers() {
        const scrollTop = window.scrollY;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
        this.triggers.filter(t => t.enabled && t.type === 'scroll_depth' && !this.triggerFired[t.id]).forEach(t => {
            if (scrollPercent >= (t.conditions?.depth || 0)) {
                this.fireTrigger(t);
            }
        });
    }

    checkKeywordTriggers() {
        const urlStr = window.location.href.toLowerCase();
        const titleStr = document.title.toLowerCase();
        
        this.triggers.filter(t => t.enabled && t.type === 'keyword_match' && !this.triggerFired[t.id]).forEach(t => {
            const keywordsInput = t.conditions?.keywords || '';
            const keywords = keywordsInput.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
            
            const matches = keywords.some(kw => urlStr.includes(kw) || titleStr.includes(kw));
            if (matches) {
                this.fireTrigger(t);
            }
        });
    }

    fireTrigger(trigger) {
        this.triggerFired[trigger.id] = true;
        this.addMessage(trigger.message, 'ai');
        this.openChat();
    }

    openChat() {
        this.chatWindow.style.display = 'flex';
        this.floatBtn.style.display = 'none';
    }

    createWidget() {
        // Create floating button
        this.floatBtn = document.createElement('button');
        this.floatBtn.className = 'aics-float-btn';
        this.floatBtn.innerHTML = this.widgetSettings.avatar;
        this.floatBtn.style.background = this.widgetSettings.primaryColor;
        document.body.appendChild(this.floatBtn);

        // Create chat container
        this.chatContainer = document.createElement('div');
        this.chatContainer.className = 'aics-chat-container';
        this.chatContainer.innerHTML = `
            <div class="aics-chat-header" style="background: ${this.widgetSettings.primaryColor}">
                <div class="aics-header-title">
                    <div class="aics-avatar">${this.widgetSettings.avatar}</div>
                    <div class="aics-title-text">
                        <h3>${this.widgetSettings.title}</h3>
                        <p>Online</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${this.widgetSettings.whatsappUrl ? `<a href="${this.widgetSettings.whatsappUrl}" target="_blank" title="WhatsApp" style="color:white;text-decoration:none;font-size:16px;">💬</a>` : ''}
                    ${this.widgetSettings.telegramUrl ? `<a href="${this.widgetSettings.telegramUrl}" target="_blank" title="Telegram" style="color:white;text-decoration:none;font-size:16px;">✈️</a>` : ''}
                    ${this.widgetSettings.messengerUrl ? `<a href="${this.widgetSettings.messengerUrl}" target="_blank" title="Messenger" style="color:white;text-decoration:none;font-size:16px;">Ⓜ️</a>` : ''}
                    <select id="aics-lang-select" style="padding:4px 8px;border-radius:6px;border:none;background:rgba(255,255,255,0.2);color:white;cursor:pointer;">
                        <option value="en">EN</option>
                        <option value="bn">BN</option>
                    </select>
                    <button class="aics-close-btn">&times;</button>
                </div>
            </div>
            <div class="aics-chat-messages" id="aics-messages">
                <div class="aics-message ai">Hi there! 👋 How can I help you today?</div>
            </div>
            <div class="aics-chat-input">
                <button id="aics-file-btn" class="aics-file-btn" aria-label="Upload file" style="background: ${this.widgetSettings.primaryColor}; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: white; border: none; cursor: pointer; font-size: 18px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                        <path d="M16.5 6.5L7.5 15.5C6.94772 16.0523 6.94772 16.9477 7.5 17.5C8.05228 18.0523 8.94772 18.0523 9.5 17.5L18.5 8.5C19.8807 7.11929 19.8807 4.88071 18.5 3.5C17.1193 2.11929 14.8807 2.11929 13.5 3.5L5.5 11.5C3.11929 13.8807 3.11929 17.1193 5.5 19.5C7.88071 21.8807 11.1193 21.8807 13.5 19.5L20.5 12.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <input type="file" id="aics-file-input" style="display: none" accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.xml,.json,.md,.rtf">
                <input type="text" id="aics-input" placeholder="Type your message...">
                <button id="aics-send-btn" class="aics-send-btn" style="background: ${this.widgetSettings.primaryColor}">➤</button>
            </div>
        `;
        document.body.appendChild(this.chatContainer);

        // Store references to elements (scoped to this.chatContainer to avoid conflicts)
        this.messagesContainer = this.chatContainer.querySelector('#aics-messages');
        this.inputField = this.chatContainer.querySelector('#aics-input');
        this.sendBtn = this.chatContainer.querySelector('#aics-send-btn');
        this.closeBtn = this.chatContainer.querySelector('.aics-close-btn');
        this.chatHeader = this.chatContainer.querySelector('.aics-chat-header');
        this.fileBtn = this.chatContainer.querySelector('#aics-file-btn');
        this.fileInput = this.chatContainer.querySelector('#aics-file-input');
        
        // Drag state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
    }

    attachEventListeners() {
        // Open/close
        this.floatBtn.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.toggleChat());

        // File upload
        this.fileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Drag functionality
        this.chatHeader.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        this.chatHeader.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
        document.addEventListener('touchend', () => this.stopDrag());
    }
    
    startDrag(e) {
        const isMobile = window.innerWidth < 650;
        if (isMobile) return; // Don't allow dragging on mobile
        
        e.preventDefault();
        this.isDragging = true;
        
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        const rect = this.chatContainer.getBoundingClientRect();
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;
    }
    
    drag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        let newX = clientX - this.dragOffset.x;
        let newY = clientY - this.dragOffset.y;
        
        // Constrain to viewport
        const maxX = window.innerWidth - this.chatContainer.offsetWidth;
        const maxY = window.innerHeight - this.chatContainer.offsetHeight;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        // Update position (reset bottom/right for desktop)
        this.chatContainer.style.left = `${newX}px`;
        this.chatContainer.style.top = `${newY}px`;
        this.chatContainer.style.bottom = 'auto';
        this.chatContainer.style.right = 'auto';
    }
    
    stopDrag() {
        this.isDragging = false;
    }
    
    handleResize() {
        const isMobile = window.innerWidth < 650;
        if (this.chatContainer.classList.contains('active')) {
            if (isMobile) {
                this.floatBtn.style.display = 'none';
            } else {
                this.floatBtn.style.display = 'flex';
            }
        }
    }

    toggleChat() {
        this.chatContainer.classList.toggle('active');
        const isMobile = window.innerWidth < 650;
        if (this.chatContainer.classList.contains('active')) {
            // Reset position for mobile
            if (isMobile) {
                this.chatContainer.style.left = '0';
                this.chatContainer.style.top = '0';
                this.chatContainer.style.bottom = '0';
                this.chatContainer.style.right = '0';
                this.floatBtn.style.display = 'none';
            } else {
                // Desktop: set initial left/top from bottom/right if not already set
                if (!this.chatContainer.style.left || this.chatContainer.style.left === 'auto') {
                    const computedStyle = window.getComputedStyle(this.chatContainer);
                    const bottom = parseFloat(computedStyle.bottom) || 100;
                    const right = parseFloat(computedStyle.right) || 30;
                    this.chatContainer.style.left = `${window.innerWidth - this.chatContainer.offsetWidth - right}px`;
                    this.chatContainer.style.top = `${window.innerHeight - this.chatContainer.offsetHeight - bottom}px`;
                    this.chatContainer.style.bottom = 'auto';
                    this.chatContainer.style.right = 'auto';
                }
                this.floatBtn.style.display = 'flex';
            }
            this.inputField.focus();
        } else {
            // Show floating button
            this.floatBtn.style.display = 'flex';
        }
    }

    isMessageRelevant(message, formMessage) {
        const normalizeText = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
        const messageWords = normalizeText(message);
        const formWords = normalizeText(formMessage);
        const commonWords = messageWords.filter(word => formWords.includes(word));
        console.log('isMessageRelevant: messageWords:', messageWords);
        console.log('isMessageRelevant: formWords:', formWords);
        console.log('isMessageRelevant: commonWords:', commonWords);
        return commonWords.length > 0;
    }

    async sendMessage() {
        const message = this.inputField.value.trim();
        if (!message) return;

        console.log('sendMessage called with message:', message);
        console.log('justSubmittedLeadForm:', this.justSubmittedLeadForm);
        console.log('lastLeadFormMessage:', this.lastLeadFormMessage);

        // Check if user just submitted a lead form
        if (this.justSubmittedLeadForm) {
            const relevant = this.isMessageRelevant(message, this.lastLeadFormMessage);
            console.log('isMessageRelevant returned:', relevant);
            if (!relevant) {
                // Add user message
                this.addMessage(message, 'user');
                this.inputField.value = '';
                // Show the required response
                this.addMessage('It looks like your question is not related to the form you submitted. Please ask a question relevant to your request so I can assist you better.', 'ai');
                return;
            }
            // Reset the flag if message is relevant
            this.justSubmittedLeadForm = false;
        }

        // Add user message
        this.addMessage(message, 'user');
        this.inputField.value = '';
        this.sendBtn.disabled = true;

        // Show typing indicator
        this.showTypingIndicator();

        // Use REST API (works on Vercel)
        try {
            const csrfToken = await getCsrfToken();
            const headers = { 'Content-Type': 'application/json' };
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }
            const response = await fetch(`${apiOrigin}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ 
                    message,
                    businessId: this.businessId,
                    conversationId: this.conversationId,
                    visitor: this.visitor
                }),
                credentials: 'include'
            });

            const data = await response.json();
            this.hideTypingIndicator();
             
            if (data.success) {
                if (data.conversationId) {
                    this.conversationId = data.conversationId;
                    localStorage.setItem(this.getStorageKey(), this.conversationId);
                }
                 
                // Intercept tool calls
                if (data.isToolCall && data.toolCall) {
                    await this.handleClientToolCall(data.toolCall);
                    this.sendBtn.disabled = false;
                    return;
                }

                this.addMessage(data.response, 'ai');
                const hasHumanKeywords = /human|escalate|talk\s+to|contact\s+support|assist\s+further|can't help|don't know|don't have information|contact\s+form|complete the contact form below/i.test(data.response);
                if (data.needsHumanHelp || hasHumanKeywords) {
                    setTimeout(() => this.showLeadForm(), 500);
                }
            } else {
                this.addMessage('Sorry, something went wrong. Please try again.', 'ai');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I\'m having trouble connecting. Please check your internet.', 'ai');
        }

        this.sendBtn.disabled = false;
    }

    async handleClientToolCall(toolCall) {
        const { id, name, arguments: args } = toolCall;
        console.log('[WIDGET] Received tool call request:', name, args);

        let result = null;

        if (window.aicsWidgetHandlers && typeof window.aicsWidgetHandlers[name] === 'function') {
            try {
                result = await window.aicsWidgetHandlers[name](args);
            } catch (err) {
                result = { error: `Handler failed: ${err.message}` };
            }
        } 
        else if (name === 'fillForm') {
            result = this.defaultFillFormHandler(args);
        } else if (name === 'showBookingForm') {
            result = await this.renderInteractiveBookingForm(id);
        } else if (name === 'showContactForm') {
            result = await this.renderInteractiveContactForm(id);
        } else if (name === 'showFeedbackForm') {
            result = await this.renderInteractiveFeedbackForm(id);
        } else if (name === 'searchProducts') {
            const { query, maxBudget } = args;
            try {
                let url = `${apiOrigin}/api/businesses/${this.businessId}/products?query=${encodeURIComponent(query || '')}`;
                if (maxBudget) {
                    url += `&maxBudget=${maxBudget}`;
                }
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.success && data.products && data.products.length > 0) {
                    const container = document.createElement('div');
                    container.style.cssText = 'display:flex; flex-direction:column; gap:12px; margin-top:8px; width:100%;';
                    
                    const title = document.createElement('div');
                    title.innerText = `Found ${data.products.length} items matching your query:`;
                    title.style.cssText = 'font-weight:bold; margin-bottom:4px; font-size: 13px; color: #1a202c;';
                    container.appendChild(title);

                    data.products.forEach(p => {
                        const card = document.createElement('div');
                        card.style.cssText = 'border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; background:white; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); display:flex; flex-direction:column; width: 100%; margin-bottom: 8px; text-align: left;';
                        
                        if (p.imageUrl) {
                            const img = document.createElement('img');
                            img.src = p.imageUrl;
                            img.style.cssText = 'width:100%; height:140px; object-fit:cover;';
                            img.onerror = () => img.style.display = 'none';
                            card.appendChild(img);
                        }

                        const body = document.createElement('div');
                        body.style.cssText = 'padding:12px; display:flex; flex-direction:column; gap:6px;';
                        
                        const nameEl = document.createElement('div');
                        nameEl.innerText = p.name;
                        nameEl.style.cssText = 'font-weight:700; font-size:14px; color:#1a202c;';
                        body.appendChild(nameEl);

                        if (p.description) {
                            const descEl = document.createElement('div');
                            descEl.innerText = p.description;
                            descEl.style.cssText = 'font-size:12px; color:#4a5568; line-height:1.4;';
                            body.appendChild(descEl);
                        }

                        const priceEl = document.createElement('div');
                        priceEl.innerText = `$${Number(p.price).toFixed(2)}`;
                        priceEl.style.cssText = 'font-size:16px; font-weight:700; color:#7c3aed; margin-top:4px;';
                        body.appendChild(priceEl);

                        if (p.linkUrl) {
                            const link = document.createElement('a');
                            link.href = p.linkUrl;
                            link.target = '_blank';
                            link.innerText = 'View Details';
                            link.style.cssText = 'display:block; text-align:center; padding:8px; background:#7c3aed; color:white; border-radius:6px; font-size:12px; font-weight:600; text-decoration:none; margin-top:8px;';
                            body.appendChild(link);
                        }

                        card.appendChild(body);
                        container.appendChild(card);
                    });

                    this.addMessage(container, 'ai');
                    result = { count: data.products.length, products: data.products };
                } else {
                    const errorMsg = `No products found matching "${query}"${maxBudget ? ` under $${maxBudget}` : ''}.`;
                    this.addMessage(errorMsg, 'ai');
                    result = { count: 0, products: [] };
                }
            } catch (err) {
                console.error('[WIDGET] Error searching products:', err);
                result = { error: `Failed to search products: ${err.message}` };
            }
        } else if (name === 'trackOrder') {
            const { orderId } = args;
            const statuses = ['Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];
            const charSum = orderId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const status = statuses[charSum % statuses.length];
            const date = new Date();
            date.setDate(date.getDate() - (statuses.length - (charSum % statuses.length)));
            
            const trackResult = `📦 **Order Tracking Details**
- **Order ID**: ${orderId}
- **Status**: ${status}
- **Last Updated**: ${date.toLocaleDateString()}
- **Carrier**: Simulated Express Shipping`;
            
            this.addMessage(trackResult, 'ai');
            result = { orderId, status, carrier: 'Simulated Express Shipping', lastUpdated: date.toISOString() };
        } else if (name === 'bookAppointment') {
            const { dateTime, name: item, notes } = args;
            const confirmationId = 'BK' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const bookingResult = `📅 **Booking Confirmed!**
- **Item/Service**: ${item || 'Appointment'}
- **Date/Time**: ${dateTime}
- **Confirmation Code**: #${confirmationId}
${notes ? `- **Notes**: ${notes}` : ''}`;
            
            this.addMessage(bookingResult, 'ai');
            result = { success: true, confirmationId, dateTime, item, notes };
        } else {
            result = { error: `Tool ${name} is not registered or supported by this site.` };
        }

        console.log('[WIDGET] Tool call result:', result);

        this.showTypingIndicator();
        try {
            const csrfToken = await getCsrfToken();
            const headers = { 'Content-Type': 'application/json' };
            if (csrfToken) { headers['X-CSRF-Token'] = csrfToken; }

            const response = await fetch(`${apiOrigin}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    toolCallId: id,
                    toolName: name,
                    toolResult: result,
                    businessId: this.businessId,
                    conversationId: this.conversationId,
                    visitor: this.visitor
                }),
                credentials: 'include'
            });

            const data = await response.json();
            this.hideTypingIndicator();

            if (data.success) {
                if (data.isToolCall && data.toolCall) {
                    await this.handleClientToolCall(data.toolCall);
                } else {
                    this.addMessage(data.response, 'ai');
                }
            } else {
                this.addMessage('Sorry, there was an error processing the request.', 'ai');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Connection lost while executing command.', 'ai');
        }
    }

    defaultFillFormHandler(args) {
        const { formId, data } = args;
        const form = formId ? document.querySelector(formId) : document.querySelector('form');
        if (!form) return { error: 'Form not found on page.' };

        let filledCount = 0;
        for (const [key, value] of Object.entries(data)) {
            const input = form.querySelector(`[name="${key}"], #${key}`) || 
                          Array.from(form.querySelectorAll('input, textarea, select')).find(el => {
                              const placeholder = el.getAttribute('placeholder') || '';
                              return placeholder.toLowerCase().includes(key.toLowerCase());
                          });
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
            }
        }
        return { success: true, message: `Successfully filled ${filledCount} fields in the form.` };
    }

    renderInteractiveBookingForm(toolCallId) {
        return new Promise((resolve) => {
            this.inputField.disabled = true;
            this.sendBtn.disabled = true;

            const formDiv = document.createElement('div');
            formDiv.className = 'aics-message ai';
            formDiv.innerHTML = `
                <div style="margin-bottom: 10px; font-weight: 600;">Select a date and time for your booking:</div>
                <form id="aics-interactive-booking" style="display: flex; flex-direction: column; gap: 8px;">
                    <input type="datetime-local" id="aics-book-datetime" required style="padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box;">
                    <input type="text" id="aics-book-name" placeholder="Your Name/Reason" required style="padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box;">
                    <textarea id="aics-book-notes" placeholder="Notes (optional)" style="padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; min-height: 50px; width: 100%; box-sizing: border-box;"></textarea>
                    <button type="submit" style="padding: 8px 12px; background: ${this.widgetSettings.primaryColor}; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600;">Confirm Booking</button>
                </form>
            `;
            this.messagesContainer.appendChild(formDiv);
            this.scrollToBottom();

            const form = formDiv.querySelector('#aics-interactive-booking');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const dateTime = formDiv.querySelector('#aics-book-datetime').value;
                const name = formDiv.querySelector('#aics-book-name').value;
                const notes = formDiv.querySelector('#aics-book-notes').value;

                formDiv.innerHTML = `<div style="color: #2e7d32; font-weight: 600;">📅 Booking details submitted: ${new Date(dateTime).toLocaleString()} (${name})</div>`;
                
                this.inputField.disabled = false;
                this.sendBtn.disabled = false;
                resolve({ success: true, booking: { dateTime, name, notes } });
            });
        });
    }

    renderInteractiveContactForm(toolCallId) {
        return new Promise((resolve) => {
            this.inputField.disabled = true;
            this.sendBtn.disabled = true;

            const formDiv = document.createElement('div');
            formDiv.className = 'aics-message ai';
            formDiv.innerHTML = `
                <div style="margin-bottom: 10px; font-weight: 600;">Please fill out your contact details:</div>
                <form id="aics-interactive-contact" style="display: flex; flex-direction: column; gap: 8px;">
                    <input type="text" id="aics-cont-name" placeholder="Your Name" required style="padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box;">
                    <input type="email" id="aics-cont-email" placeholder="Your Email" required style="padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box;">
                    <input type="tel" id="aics-cont-phone" placeholder="Phone Number (optional)" style="padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box;">
                    <textarea id="aics-cont-msg" placeholder="Your message..." required style="padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; min-height: 60px; width: 100%; box-sizing: border-box;"></textarea>
                    <button type="submit" style="padding: 8px 12px; background: ${this.widgetSettings.primaryColor}; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600;">Send Info</button>
                </form>
            `;
            this.messagesContainer.appendChild(formDiv);
            this.scrollToBottom();

            const form = formDiv.querySelector('#aics-interactive-contact');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = formDiv.querySelector('#aics-cont-name').value;
                const email = formDiv.querySelector('#aics-cont-email').value;
                const phone = formDiv.querySelector('#aics-cont-phone').value;
                const message = formDiv.querySelector('#aics-cont-msg').value;

                formDiv.innerHTML = `<div style="color: #2e7d32; font-weight: 600;">✉️ Contact form submitted successfully! Thank you.</div>`;
                
                fetch(`${apiOrigin}/api/businesses/${this.businessId}/leads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, message, conversationId: this.conversationId }),
                    credentials: 'include'
                }).catch(err => console.error('[WIDGET] Error auto-saving lead:', err));

                this.inputField.disabled = false;
                this.sendBtn.disabled = false;
                resolve({ success: true, contactInfo: { name, email, phone, message } });
            });
        });
    }

    renderInteractiveFeedbackForm(toolCallId) {
        return new Promise((resolve) => {
            this.inputField.disabled = true;
            this.sendBtn.disabled = true;

            const formDiv = document.createElement('div');
            formDiv.className = 'aics-message ai';
            formDiv.innerHTML = `
                <div style="margin-bottom: 10px; font-weight: 600;">How would you rate our service?</div>
                <form id="aics-interactive-feedback" style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; gap: 8px; justify-content: center; font-size: 24px; cursor: pointer;" id="aics-star-container">
                        <span data-value="1">☆</span>
                        <span data-value="2">☆</span>
                        <span data-value="3">☆</span>
                        <span data-value="4">☆</span>
                        <span data-value="5">☆</span>
                    </div>
                    <input type="hidden" id="aics-rating-value" value="0">
                    <textarea id="aics-feedback-comment" placeholder="Leave your feedback (optional)" style="padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; min-height: 50px; width: 100%; box-sizing: border-box;"></textarea>
                    <button type="submit" style="padding: 8px 12px; background: ${this.widgetSettings.primaryColor}; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600;">Submit Feedback</button>
                </form>
            `;
            this.messagesContainer.appendChild(formDiv);
            this.scrollToBottom();

            const stars = formDiv.querySelectorAll('#aics-star-container span');
            let ratingValue = 0;
            stars.forEach(star => {
                star.addEventListener('click', () => {
                    ratingValue = parseInt(star.getAttribute('data-value'));
                    formDiv.querySelector('#aics-rating-value').value = ratingValue;
                    stars.forEach((s, i) => {
                        s.innerHTML = i < ratingValue ? '★' : '☆';
                        s.style.color = i < ratingValue ? '#ffb300' : 'inherit';
                    });
                });
            });

            const form = formDiv.querySelector('#aics-interactive-feedback');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const rating = parseInt(formDiv.querySelector('#aics-rating-value').value);
                const comment = formDiv.querySelector('#aics-feedback-comment').value;

                if (rating === 0) {
                    alert('Please select a rating');
                    return;
                }

                formDiv.innerHTML = `<div style="color: #2e7d32; font-weight: 600;">⭐ Thank you for your feedback! Rating: ${rating}/5</div>`;
                
                this.inputField.disabled = false;
                this.sendBtn.disabled = false;
                resolve({ success: true, rating, comment });
            });
        });
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = {
                name: file.name,
                type: file.type,
                data: e.target.result,
                size: file.size
            };
            this.addMessage(fileData, 'user');
            this.uploadFile(fileData);
        };
        reader.readAsDataURL(file);
        this.fileInput.value = ''; // Clear input
    }

    async uploadFile(fileData) {
        try {
            const csrfToken = await getCsrfToken();
            const headers = { 'Content-Type': 'application/json' };
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }
            const response = await fetch(`${apiOrigin}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    file: fileData,
                    businessId: this.businessId,
                    conversationId: this.conversationId,
                    visitor: this.visitor
                }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                if (data.conversationId) {
                    this.conversationId = data.conversationId;
                    localStorage.setItem(this.getStorageKey(), this.conversationId);
                }
                this.addMessage(data.response, 'ai');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            this.addMessage('Sorry, there was an error uploading your file.', 'ai');
        }
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `aics-message ${type}`;
        
        if (content instanceof HTMLElement) {
            messageDiv.appendChild(content);
        } else if (typeof content === 'string') {
            // Text message
            messageDiv.innerHTML = this.parseMarkdown(content);
        } else if (content && content.name && content.type && content.data) {
            // File message
            const isImage = content.type.startsWith('image/');
            messageDiv.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${isImage ? 
                        `<img src="${content.data}" alt="${content.name}" style="max-width:250px;max-height:300px;border-radius:8px;">` : 
                        `<a href="${content.data}" download="${content.name}" style="display:flex;align-items:center;gap:8px;padding:10px;background:#f0f0f0;border-radius:8px;text-decoration:none;color:#333;">
                            <span>📄</span>
                            <span>${content.name}</span>
                        </a>`
                    }
                    ${typeof content.text === 'string' ? `<div style="color:inherit;">${this.parseMarkdown(content.text)}</div>` : ''}
                </div>
            `;
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    parseMarkdown(text) {
        if (!text || typeof text !== 'string') return '';
        
        let inCodeBlock = false;
        let codeContent = [];
        let codeLanguage = '';
        
        let lines = text.split('\n');
        let processedLines = [];
        
        let inList = false;
        let inTable = false;
        let tableRows = [];
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // Code blocks
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    inCodeBlock = false;
                    const escapedCode = codeContent.join('\n')
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                    processedLines.push(`<pre style="background:#2d3748; color:#f7fafc; padding:12px; border-radius:8px; overflow-x:auto; margin:8px 0; font-family:monospace; font-size:13px; line-height:1.4;"><code class="language-${codeLanguage}">${escapedCode}</code></pre>`);
                    codeContent = [];
                    codeLanguage = '';
                } else {
                    inCodeBlock = true;
                    codeLanguage = line.trim().substring(3).trim();
                }
                continue;
            }
            
            if (inCodeBlock) {
                codeContent.push(line);
                continue;
            }
            
            // Lists
            let listMatch = line.match(/^(\s*)[*+-]\s+(.+)/);
            if (listMatch) {
                if (!inList) {
                    inList = true;
                    processedLines.push('<ul style="margin:6px 0; padding-left:20px; list-style-type:disc;">');
                }
                processedLines.push(`<li style="margin:3px 0;">${listMatch[2]}</li>`);
                continue;
            } else if (inList && line.trim() === '') {
                let nextLine = lines[i+1];
                if (!nextLine || !nextLine.match(/^(\s*)[*+-]\s+(.+)/)) {
                    inList = false;
                    processedLines.push('</ul>');
                }
                continue;
            } else if (inList) {
                inList = false;
                processedLines.push('</ul>');
            }
            
            // Tables
            let isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
            if (isTableRow) {
                if (line.includes('---')) {
                    continue;
                }
                let cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
                if (!inTable) {
                    inTable = true;
                    tableRows.push('<table style="width:100%; border-collapse:collapse; margin:10px 0; border:1px solid #e2e8f0; font-size:13px;">');
                    tableRows.push('<thead><tr style="background:#f7fafc; border-bottom:2px solid #edf2f7;">');
                    cells.forEach(cell => {
                        tableRows.push(`<th style="padding:8px; border:1px solid #edf2f7; text-align:left; font-weight:600;">${cell}</th>`);
                    });
                    tableRows.push('</tr></thead><tbody>');
                } else {
                    tableRows.push('<tr style="border-bottom:1px solid #edf2f7;">');
                    cells.forEach(cell => {
                        tableRows.push(`<td style="padding:8px; border:1px solid #edf2f7;">${cell}</td>`);
                    });
                    tableRows.push('</tr>');
                }
                continue;
            } else if (inTable) {
                inTable = false;
                tableRows.push('</tbody></table>');
                processedLines.push(tableRows.join(''));
                tableRows = [];
            }
            
            // Headers
            if (line.startsWith('### ')) {
                processedLines.push(`<h5 style="margin:10px 0 4px 0; font-weight:600; font-size:14px; color:#2d3748;">${line.substring(4)}</h5>`);
                continue;
            } else if (line.startsWith('## ')) {
                processedLines.push(`<h4 style="margin:12px 0 6px 0; font-weight:600; font-size:16px; color:#2d3748;">${line.substring(3)}</h4>`);
                continue;
            } else if (line.startsWith('# ')) {
                processedLines.push(`<h3 style="margin:14px 0 8px 0; font-weight:600; font-size:18px; color:#2d3748;">${line.substring(2)}</h3>`);
                continue;
            }
            
            processedLines.push(line);
        }
        
        if (inList) {
            processedLines.push('</ul>');
        }
        if (inTable) {
            tableRows.push('</tbody></table>');
            processedLines.push(tableRows.join(''));
        }
        
        let finalHtml = processedLines.join('\n');
        finalHtml = finalHtml.replace(/`([^`]+)`/g, '<code style="background:#edf2f7; color:#2d3748; padding:2px 4px; border-radius:4px; font-family:monospace; font-size:12px;">$1</code>');
        finalHtml = finalHtml.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        finalHtml = finalHtml.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        finalHtml = finalHtml.split('\n').map(l => {
            if (l.trim().startsWith('<') || l.trim() === '') {
                return l;
            }
            return l + '<br>';
        }).join('\n');
        
        return finalHtml;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'aics-typing';
        typingDiv.className = 'aics-typing-indicator';
        typingDiv.innerHTML = `
            <div class="aics-typing-dot"></div>
            <div class="aics-typing-dot"></div>
            <div class="aics-typing-dot"></div>
        `;
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typing = this.chatContainer.querySelector('#aics-typing');
        if (typing) { typing.remove(); }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }


    showLeadForm() {
        this.showingLeadForm = true;
        this.inputField.disabled = true;
        this.sendBtn.disabled = true;

        // Add lead form message
        const formDiv = document.createElement('div');
        formDiv.className = 'aics-message ai';
        formDiv.innerHTML = `
            <div style="margin-bottom: 12px;">Sure! Please fill out the form below and our team will get back to you shortly.</div>
            <form id="aics-lead-form" style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" id="aics-lead-name" placeholder="Your Name" required style="padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                <input type="email" id="aics-lead-email" placeholder="Your Email" required style="padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                <input type="tel" id="aics-lead-phone" placeholder="Your Phone (optional)" style="padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                <textarea id="aics-lead-message" placeholder="How can we help you?" required style="padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; min-height: 80px; resize: vertical;"></textarea>
                <button type="submit" style="padding: 10px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">Send Request</button>
            </form>
        `;
        this.messagesContainer.appendChild(formDiv);
        this.scrollToBottom();

        // Attach form submit listener
        const form = this.chatContainer.querySelector('#aics-lead-form');
        form.addEventListener('submit', (e) => this.submitLeadForm(e));
    }

    async submitLeadForm(e) {
        e.preventDefault();
        const name = this.chatContainer.querySelector('#aics-lead-name').value;
        const email = this.chatContainer.querySelector('#aics-lead-email').value;
        const phone = this.chatContainer.querySelector('#aics-lead-phone').value;
        const message = this.chatContainer.querySelector('#aics-lead-message').value;

        console.log('submitLeadForm called with message:', message);

        // Store visitor data for future messages
        this.visitor = { name, email, phone };

        try {
            const csrfToken = await getCsrfToken();
            const headers = { 'Content-Type': 'application/json' };
            if (csrfToken) { headers['X-CSRF-Token'] = csrfToken; }
            const response = await fetch(`${apiOrigin}/api/businesses/${this.businessId}/leads`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name, email, phone, message, conversationId: this.conversationId }),
                credentials: 'include'
            });

            const data = await response.json();

            console.log('submitLeadForm response:', data);

            if (data.success) {
                // Remove form and show success message
                const formDiv = document.getElementById('aics-lead-form').parentElement;
                formDiv.innerHTML = '<div>Thank you! We\'ve received your request and will get back to you soon.</div>';
                
                this.showingLeadForm = false;
                this.justSubmittedLeadForm = true;
                this.lastLeadFormMessage = message;
                console.log('Set justSubmittedLeadForm to true, lastLeadFormMessage to:', this.lastLeadFormMessage);
                this.inputField.disabled = false;
                this.sendBtn.disabled = false;
            } else {
                this.addMessage('Sorry, there was an error sending your request. Please try again.', 'ai');
            }
        } catch (error) {
            console.error('submitLeadForm error:', error);
            this.addMessage('Sorry, there was an error sending your request. Please try again.', 'ai');
        }
    }
}

// Initialize the widget when DOM is loaded
function initWidget() {
    // Get business ID from script tag data attribute
    const scriptTags = document.querySelectorAll('script[data-business-id]');
    const scriptTag = scriptTags[scriptTags.length - 1]; // Get the last one (the one we just added
    const businessId = scriptTag ? scriptTag.getAttribute('data-business-id') : null;
    
    new AICSChatWidget({ businessId });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
} else {
    initWidget();
}
