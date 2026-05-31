// Chat Widget JavaScript

class AICSChatWidget {
    constructor() {
        this.suggestedFaqs = [];
        this.init();
    }

    init() {
        this.createWidget();
        this.attachEventListeners();
        this.setupSocketIO();
        this.loadSuggestedQuestions();
    }

    setupSocketIO() {
        // Socket.IO is only for LOCAL DEV (Vercel serverless doesn't support it well)
        // So we'll use REST API by default!
        this.socket = null;
        // Try to connect for local dev, but don't break if it fails
        try {
            this.socket = io();
            this.socket.on('ai response', (response) => {
                this.hideTypingIndicator();
                this.addMessage(response, 'ai');
                this.sendBtn.disabled = false;
            });
        } catch (e) {
            console.log('Socket.IO not available, using REST API');
        }
    }

    createWidget() {
        // Create floating button
        this.floatBtn = document.createElement('button');
        this.floatBtn.className = 'aics-float-btn';
        this.floatBtn.innerHTML = '💬';
        document.body.appendChild(this.floatBtn);

        // Create chat container
        this.chatContainer = document.createElement('div');
        this.chatContainer.className = 'aics-chat-container';
        this.chatContainer.innerHTML = `
            <div class="aics-chat-header">
                <div class="aics-header-title">
                    <div class="aics-avatar">🤖</div>
                    <div class="aics-title-text">
                        <h3>AI Support</h3>
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
                <button class="aics-send-btn" id="aics-send">➤</button>
            </div>
        `;
        document.body.appendChild(this.chatContainer);

        // Store references to elements
        this.messagesContainer = document.getElementById('aics-messages');
        this.inputField = document.getElementById('aics-input');
        this.sendBtn = document.getElementById('aics-send');
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
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

    async loadSuggestedQuestions() {
        try {
            const response = await fetch('/api/get-faqs');
            const data = await response.json();
            
            if (data.success && data.faqs.length > 0) {
                this.suggestedFaqs = data.faqs;
                this.renderSuggestedQuestions();
            } else {
                // If no FAQs yet, show some default suggestions
                this.renderDefaultSuggestions();
            }
        } catch (error) {
            console.error('Error loading suggested questions:', error);
            this.renderDefaultSuggestions();
        }
    }

    renderSuggestedQuestions() {
        this.suggestedContainer.innerHTML = '';
        
        this.suggestedFaqs.slice(0, 6).forEach(faq => {
            const btn = document.createElement('button');
            btn.className = 'aics-suggested-btn';
            btn.textContent = faq.question;
            btn.addEventListener('click', () => this.sendMessageFromSuggestion(faq.question));
            this.suggestedContainer.appendChild(btn);
        });
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AICSChatWidget());
} else {
    new AICSChatWidget();
}
