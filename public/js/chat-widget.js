// Chat Widget JavaScript
console.log('AICS Chat Widget script loaded!');

class AICSChatWidget {
    constructor(options = {}) {
        console.log('AICS Chat Widget constructor called');
        this.businessId = options.businessId || null;
        this.widgetSettings = {
            title: 'AI Support',
            primaryColor: '#667eea',
            avatar: '🤖'
        };
        this.init();
    }

    async init() {
        console.log('AICS Chat Widget init() called');
        
        // Load widget settings if business ID is provided
        if (this.businessId) {
            await this.loadWidgetSettings();
        }
        
        this.createWidget();
        this.attachEventListeners();
        this.renderDefaultSuggestions();
    }

    async loadWidgetSettings() {
        try {
            const response = await fetch(`/api/businesses/${this.businessId}/widget`);
            const data = await response.json();
            
            if (data.success && data.settings) {
                this.widgetSettings = { ...this.widgetSettings, ...data.settings };
            }
        } catch (error) {
            console.error('Error loading widget settings:', error);
        }
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
            <p class="aics-suggested-header">Try asking:</p>
            <div class="aics-suggested-questions" id="aics-suggested"></div>
            <div class="aics-chat-messages" id="aics-messages">
                <div class="aics-message ai">Hi there! 👋 How can I help you today?</div>
            </div>
            <div class="aics-chat-input">
                <input type="text" id="aics-input" placeholder="Type your message...">
                <button id="aics-send-btn" class="aics-send-btn" style="background: ${this.widgetSettings.primaryColor}">➤</button>
            </div>
        `;
        document.body.appendChild(this.chatContainer);

        // Store references to elements
        this.messagesContainer = document.getElementById('aics-messages');
        this.inputField = document.getElementById('aics-input');
        this.sendBtn = document.getElementById('aics-send-btn');
        this.closeBtn = this.chatContainer.querySelector('.aics-close-btn');
        this.suggestedContainer = document.getElementById('aics-suggested');
    }

    attachEventListeners() {
        // Open/close
        this.floatBtn.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.toggleChat());

        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    toggleChat() {
        this.chatContainer.classList.toggle('active');
        if (this.chatContainer.classList.contains('active')) {
            this.inputField.focus();
        }
    }

    async sendMessage() {
        const message = this.inputField.value.trim();
        if (!message) return;

        // Add user message
        this.addMessage(message, 'user');
        this.inputField.value = '';
        this.sendBtn.disabled = true;

        // Show typing indicator
        this.showTypingIndicator();

        // Use REST API (works on Vercel)
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message,
                    businessId: this.businessId
                })
            });

            const data = await response.json();
            this.hideTypingIndicator();
            
            if (data.success) {
                this.addMessage(data.response, 'ai');
            } else {
                this.addMessage('Sorry, something went wrong. Please try again.', 'ai');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I\'m having trouble connecting. Please check your internet.', 'ai');
            console.error('API error:', error);
        }

        this.sendBtn.disabled = false;
    }

    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `aics-message ${type}`;
        messageDiv.textContent = text;
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
        const typing = document.getElementById('aics-typing');
        if (typing) {
            typing.remove();
        }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    renderDefaultSuggestions() {
        const defaultQuestions = [
            'What are your business hours?',
            'Do you offer refunds?',
            'How can I contact support?',
            'Where are you located?'
        ];
        
        this.suggestedContainer.innerHTML = '';
        
        defaultQuestions.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'aics-suggested-btn';
            btn.textContent = q;
            btn.addEventListener('click', () => this.sendMessageFromSuggestion(q));
            this.suggestedContainer.appendChild(btn);
        });
    }

    sendMessageFromSuggestion(question) {
        this.inputField.value = question;
        this.sendMessage();
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
