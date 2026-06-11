// Chat Widget JavaScript
let cachedCsrfToken = null;

async function getCsrfToken() {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }
  try {
    const response = await fetch('/api/csrf-token', { credentials: 'include' });
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
    }

    async loadConversationHistory() {
        try {
            const response = await fetch(`/api/businesses/${this.businessId}/conversations/${this.conversationId}`);
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
            const response = await fetch(`/api/businesses/${this.businessId}/widget`);
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
            const response = await fetch(`/api/businesses/${this.businessId}/triggers`);
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
            const response = await fetch('/api/chat', {
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
                // Store conversation ID for future messages and save to localStorage
                if (data.conversationId) {
                    this.conversationId = data.conversationId;
                    localStorage.setItem(this.getStorageKey(), this.conversationId);
                }
                this.addMessage(data.response, 'ai');
                // Check either the flag or look for keywords in the response
                const hasHumanKeywords = /human|escalate|talk\s+to|contact\s+support|assist\s+further|can't help|don't know|don't have information|contact\s+form|complete the contact form below/i.test(data.response);
                if (data.needsHumanHelp || hasHumanKeywords) {
                    setTimeout(() => this.showLeadForm(), 500); // Show lead form after a short delay
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
            const response = await fetch('/api/chat', {
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
        
        if (typeof content === 'string') {
            // Text message
            messageDiv.innerHTML = content.replace(/\n/g, '<br>');
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
                    ${typeof content.text === 'string' ? `<div style="color:inherit;">${content.text.replace(/\n/g, '<br>')}</div>` : ''}
                </div>
            `;
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
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
        if (!this.businessId) {
            this.addMessage('Sorry, this chat widget is not configured with a valid business ID, so lead requests cannot be sent.', 'ai');
            return;
        }

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

        if (!this.businessId) {
            this.addMessage('Sorry, this chat widget is not configured with a valid business ID, so lead requests cannot be sent.', 'ai');
            return;
        }

        console.log('submitLeadForm called with message:', message);

        // Store visitor data for future messages
        this.visitor = { name, email, phone };

        try {
            const csrfToken = await getCsrfToken();
            const headers = { 'Content-Type': 'application/json' };
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }
            const response = await fetch(`/api/businesses/${this.businessId}/leads`, {
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
                const errorMessage = data.error || 'Sorry, there was an error sending your request. Please try again.';
                this.addMessage(errorMessage, 'ai');
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
