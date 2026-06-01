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
        this.showingLeadForm = false;
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
        await this.loadSuggestedFAQs();
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

    async loadSuggestedFAQs() {
        const defaultQuestions = [
            'What are your business hours?',
            'Do you offer refunds?',
            'How can I contact support?',
            'Where are you located?'
        ];

        let questions = defaultQuestions;

        if (this.businessId) {
            try {
                const response = await fetch(`/api/businesses/${this.businessId}/faqs`);
                const data = await response.json();
                if (data.success && Array.isArray(data.faqs) && data.faqs.length > 0) {
                    questions = data.faqs
                        .slice(0, 6)
                        .map(faq => faq.questionEn || faq.questionBn)
                        .filter(Boolean);
                }
            } catch (error) {
                console.error('Error loading suggested FAQs:', error);
            }
        }

        this.suggestedContainer.innerHTML = '';

        questions.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'aics-suggested-btn';
            btn.textContent = q;
            btn.addEventListener('click', () => this.sendMessageFromSuggestion(q));
            this.suggestedContainer.appendChild(btn);
        });

        // Add talk to human button
        if (this.businessId) {
            const humanBtn = document.createElement('button');
            humanBtn.className = 'aics-suggested-btn';
            humanBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            humanBtn.style.color = 'white';
            humanBtn.textContent = 'Talk to Human';
            humanBtn.addEventListener('click', () => this.showLeadForm());
            this.suggestedContainer.appendChild(humanBtn);
        }
    }

    sendMessageFromSuggestion(question) {
        this.inputField.value = question;
        this.sendMessage();
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
        const form = document.getElementById('aics-lead-form');
        form.addEventListener('submit', (e) => this.submitLeadForm(e));
    }

    async submitLeadForm(e) {
        e.preventDefault();
        const name = document.getElementById('aics-lead-name').value;
        const email = document.getElementById('aics-lead-email').value;
        const phone = document.getElementById('aics-lead-phone').value;
        const message = document.getElementById('aics-lead-message').value;

        try {
            const response = await fetch(`/api/businesses/${this.businessId}/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, message })
            });

            const data = await response.json();

            if (data.success) {
                // Remove form and show success message
                const formDiv = document.getElementById('aics-lead-form').parentElement;
                formDiv.innerHTML = '<div>Thank you! We\'ve received your request and will get back to you soon.</div>';
                
                this.showingLeadForm = false;
                this.inputField.disabled = false;
                this.sendBtn.disabled = false;
            } else {
                this.addMessage('Sorry, there was an error sending your request. Please try again.', 'ai');
            }
        } catch (error) {
            console.error('Error submitting lead:', error);
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
