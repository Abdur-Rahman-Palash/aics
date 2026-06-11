// AICS - Embed Widget Script
// Copy this script and paste anywhere on your website!
// Example usage:
/*
<script src="https://your-domain.com/js/embed.js" data-business-id="YOUR_BUSINESS_ID"></script>
*/

(function() {
    // Inject Chat Widget
    function initAICSWidget() {
        const scriptTags = document.querySelectorAll('script[data-business-id]');
        const scriptTag = scriptTags[scriptTags.length - 1];
        const businessId = scriptTag ? scriptTag.getAttribute('data-business-id') : null;
        const scriptSrc = scriptTag ? scriptTag.src : null;
        const apiOrigin = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;

        if (!businessId) {
            const warning = document.createElement('div');
            warning.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index:10000; max-width: 300px; padding: 16px; background: #ffe5e5; color: #a00; border: 1px solid #f5c2c2; border-radius: 12px; font-family: sans-serif; font-size: 14px;';
            warning.textContent = 'AICS embed requires a valid data-business-id attribute on the script tag.';
            document.body.appendChild(warning);
            return;
        }

        // Inject Styles
        const css = `
            .aics-float-btn { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); font-size: 24px; z-index: 10000; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
            .aics-float-btn:hover { transform: scale(1.1); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3); }
            .aics-float-btn:active { transform: scale(0.95); }
            .aics-chat-container { position: fixed; bottom: 0; left: 0; right: 0; top: 0; width: 100%; height: 100%; max-height: 100vh; background: white; border-radius: 0; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15); z-index: 9999; display: none; flex-direction: column; overflow: hidden; min-height: 0; transition: all 0.3s ease; }
            .aics-chat-container.active { display: flex; animation: slideUp 0.3s ease; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .aics-chat-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 20px; padding-top: max(16px, env(safe-area-inset-top)); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; min-width: 0; cursor: move; }
            .aics-header-title { display: flex; align-items: center; gap: 10px; }
            .aics-avatar { width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
            .aics-title-text { display: flex; flex-direction: column; overflow: hidden; }
            .aics-title-text h3 { margin: 0; font-size: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .aics-title-text p { margin: 2px 0 0 0; font-size: 12px; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .aics-close-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; flex-shrink: 0; }
            .aics-close-btn:hover { background: rgba(255, 255, 255, 0.2); }
            .aics-close-btn:active { transform: scale(0.9); }
            .aics-chat-messages { flex: 1; min-height: 0; padding: 16px; overflow-y: auto; background: #f5f7fa; display: flex; flex-direction: column; gap: 12px; -webkit-overflow-scrolling: touch; }
            .aics-message { max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-wrap: break-word; word-break: break-word; }
            .aics-message.ai { background: white; color: #333; border-bottom-left-radius: 4px; align-self: flex-start; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
            .aics-message.user { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-bottom-right-radius: 4px; align-self: flex-end; }
            .aics-chat-input { padding: 12px 16px; padding-bottom: max(12px, env(safe-area-inset-bottom)); border-top: 1px solid #e0e0e0; background: white; display: flex; gap: 10px; flex-shrink: 0; min-width: 0; }
            .aics-chat-input input { flex: 1; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 24px; font-size: 14px; outline: none; transition: border-color 0.2s; min-width: 0; }
            .aics-chat-input input:focus { border-color: #667eea; }
            .aics-send-btn { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; cursor: pointer; font-size: 18px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; touch-action: manipulation; flex-shrink: 0; }
            .aics-send-btn:hover { transform: scale(1.05); box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4); }
            .aics-send-btn:active { transform: scale(0.95); }
            .aics-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
            .aics-typing-indicator { display: flex; gap: 4px; padding: 12px 16px; background: white; border-radius: 16px; border-bottom-left-radius: 4px; align-self: flex-start; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); width: fit-content; }
            .aics-typing-dot { width: 8px; height: 8px; border-radius: 50%; background: #667eea; animation: typingBounce 1.4s infinite ease-in-out both; }
            .aics-typing-dot:nth-child(1) { animation-delay: -0.32s; }
            .aics-typing-dot:nth-child(2) { animation-delay: -0.16s; }
            @keyframes typingBounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
            @media (min-width: 650px) {
                .aics-float-btn { bottom: 30px; right: 30px; width: 60px; height: 60px; }
                .aics-chat-container { bottom: 100px; right: 30px; top: auto; left: auto; width: 380px; max-height: calc(100vh - 120px); height: 520px; border-radius: 16px; }
            }
            @media (min-width: 1025px) {
                .aics-chat-container { width: 420px; height: 580px; }
            }
        `;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);

        // State variables
        let showingLeadForm = false;
        let conversationId = null;
        let visitor = {};

        // Create Elements
        const floatBtn = document.createElement('button');
        floatBtn.className = 'aics-float-btn';
        floatBtn.innerHTML = '🤖';

        const chatContainer = document.createElement('div');
        chatContainer.className = 'aics-chat-container';
        chatContainer.innerHTML = `
            <div class="aics-chat-header">
                <div class="aics-header-title">
                    <div class="aics-avatar">🤖</div>
                    <div class="aics-title-text">
                        <h3>AI Support</h3>
                        <p>Online</p>
                    </div>
                </div>
                <button class="aics-close-btn">&times;</button>
            </div>
            <div class="aics-chat-messages" id="aics-messages">
                <div class="aics-message ai">Hi there! 👋 How can I help you today?</div>
            </div>
            <div class="aics-chat-input">
                <button class="aics-file-btn" id="aics-file-btn" aria-label="Upload file" style="background: #667eea; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: white; border: none; cursor: pointer; font-size: 18px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                        <path d="M16.5 6.5L7.5 15.5C6.94772 16.0523 6.94772 16.9477 7.5 17.5C8.05228 18.0523 8.94772 18.0523 9.5 17.5L18.5 8.5C19.8807 7.11929 19.8807 4.88071 18.5 3.5C17.1193 2.11929 14.8807 2.11929 13.5 3.5L5.5 11.5C3.11929 13.8807 3.11929 17.1193 5.5 19.5C7.88071 21.8807 11.1193 21.8807 13.5 19.5L20.5 12.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <input type="file" id="aics-file-input" style="display: none" accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.xml,.json,.md,.rtf">
                <input type="text" id="aics-input" placeholder="Type your message...">
                <button class="aics-send-btn" id="aics-send">➤</button>
            </div>
        `;

        // Append to DOM
        document.body.appendChild(floatBtn);
        document.body.appendChild(chatContainer);

        // Get Elements
        const messagesContainer = document.getElementById('aics-messages');
        const inputField = document.getElementById('aics-input');
        const sendBtn = document.getElementById('aics-send');
        const fileBtn = document.getElementById('aics-file-btn');
        const fileInput = document.getElementById('aics-file-input');
        const closeBtn = chatContainer.querySelector('.aics-close-btn');
        const chatHeader = chatContainer.querySelector('.aics-chat-header');
        
        // Drag state
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        // Attach Event Listeners
        floatBtn.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', toggleChat);
        sendBtn.addEventListener('click', sendMessage);
        fileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
        inputField.addEventListener('keypress', function(e) { if (e.key === 'Enter') sendMessage(); });
        
        // Drag functionality
        chatHeader.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        chatHeader.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', stopDrag);

        // Helper Functions
        function toggleChat() {
            const isActive = chatContainer.classList.contains('active');
            if (isActive) {
                chatContainer.classList.remove('active');
                floatBtn.style.display = 'flex';
            } else {
                chatContainer.classList.add('active');
                const isMobile = window.innerWidth < 650;
                if (isMobile) {
                    // Reset position for mobile
                    chatContainer.style.left = '0';
                    chatContainer.style.top = '0';
                    chatContainer.style.bottom = '0';
                    chatContainer.style.right = '0';
                    floatBtn.style.display = 'none';
                } else {
                    // Desktop: set initial left/top from bottom/right if not already set
                    if (!chatContainer.style.left || chatContainer.style.left === 'auto') {
                        const computedStyle = window.getComputedStyle(chatContainer);
                        const bottom = parseFloat(computedStyle.bottom) || 100;
                        const right = parseFloat(computedStyle.right) || 30;
                        chatContainer.style.left = `${window.innerWidth - chatContainer.offsetWidth - right}px`;
                        chatContainer.style.top = `${window.innerHeight - chatContainer.offsetHeight - bottom}px`;
                        chatContainer.style.bottom = 'auto';
                        chatContainer.style.right = 'auto';
                    }
                    floatBtn.style.display = 'flex';
                }
                inputField.focus();
            }
        }
        
        function startDrag(e) {
            const isMobile = window.innerWidth < 650;
            if (isMobile) return; // Don't allow dragging on mobile
            
            e.preventDefault();
            isDragging = true;
            
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            
            const rect = chatContainer.getBoundingClientRect();
            dragOffset.x = clientX - rect.left;
            dragOffset.y = clientY - rect.top;
        }
        
        function drag(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            
            let newX = clientX - dragOffset.x;
            let newY = clientY - dragOffset.y;
            
            // Constrain to viewport
            const maxX = window.innerWidth - chatContainer.offsetWidth;
            const maxY = window.innerHeight - chatContainer.offsetHeight;
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            // Update position (reset bottom/right for desktop)
            chatContainer.style.left = `${newX}px`;
            chatContainer.style.top = `${newY}px`;
            chatContainer.style.bottom = 'auto';
            chatContainer.style.right = 'auto';
        }
        
        function stopDrag() {
            isDragging = false;
        }
        function showTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.id = 'aics-typing';
            typingDiv.className = 'aics-typing-indicator';
            typingDiv.innerHTML = `
                <div class="aics-typing-dot"></div>
                <div class="aics-typing-dot"></div>
                <div class="aics-typing-dot"></div>
            `;
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        function hideTypingIndicator() {
            const typingDiv = document.getElementById('aics-typing');
            if (typingDiv) typingDiv.remove();
        }
        function scrollToBottom() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        async function sendMessage() {
            const message = inputField.value.trim();
            if (!message) return;
            
            // Add user message
            addMessage(message, 'user');
            inputField.value = '';
            sendBtn.disabled = true;
            showTypingIndicator();

            const apiUrl = `${apiOrigin}/api/chat`;
            const payload = { 
                message, 
                businessId: businessId, 
                conversationId: conversationId,
                visitor: visitor
            };

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                hideTypingIndicator();
                
                if (data.success) {
                    // Store conversation ID
                    if (data.conversationId) {
                        conversationId = data.conversationId;
                    }
                    addMessage(data.response, 'ai');
                    // Check for human help needed
                    const hasHumanKeywords = /human|escalate|talk\s+to|contact\s+support|assist\s+further|contact\s+form|complete the contact form below/i.test(data.response);
                    if (data.needsHumanHelp || hasHumanKeywords) {
                        setTimeout(() => showLeadForm(), 500);
                    }
                } else {
                    addMessage('Sorry, something went wrong.', 'ai');
                }
            } catch (err) {
                hideTypingIndicator();
                addMessage('Sorry, check internet connection.', 'ai');
            }
            sendBtn.disabled = false;
        }

        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (file.size > 10 * 1024 * 1024) {
                addMessage('Sorry, file size must be less than 10MB.', 'ai');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    data: e.target.result,
                    size: file.size
                };
                addMessage(fileData, 'user');
                await uploadFile(fileData);
            };
            reader.readAsDataURL(file);
            fileInput.value = '';
        }

        async function uploadFile(fileData) {
            const apiUrl = `${apiOrigin}/api/chat`;
            showTypingIndicator();
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        file: fileData,
                        businessId: businessId,
                        conversationId: conversationId,
                        visitor: visitor
                    })
                });
                const data = await response.json();
                hideTypingIndicator();
                if (data.success) {
                    if (data.conversationId) {
                        conversationId = data.conversationId;
                    }
                    addMessage(data.response, 'ai');
                } else {
                    addMessage('Sorry, there was an error uploading your file.', 'ai');
                }
            } catch (error) {
                hideTypingIndicator();
                addMessage('Sorry, there was an error uploading your file.', 'ai');
            }
        }

        function addMessage(content, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `aics-message ${type}`;
            if (typeof content === 'string') {
                messageDiv.textContent = content;
            } else if (content && content.name && content.type && content.data) {
                const isImage = content.type.startsWith('image/');
                if (isImage) {
                    messageDiv.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;"><img src="${content.data}" alt="${content.name}" style="max-width:250px;max-height:300px;border-radius:8px;"><div>${content.name}</div></div>`;
                } else {
                    messageDiv.innerHTML = `<div style="display:flex;align-items:center;gap:8px; padding:12px; background:#f0f0f0; border-radius:10px;"><span>📄</span><span>${content.name}</span></div>`;
                }
            } else {
                messageDiv.textContent = 'Unsupported message format.';
            }
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Lead form functions
        function showLeadForm() {
            showingLeadForm = true;
            inputField.disabled = true;
            sendBtn.disabled = true;

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
            messagesContainer.appendChild(formDiv);
            scrollToBottom();

            // Attach form submit listener
            const form = document.getElementById('aics-lead-form');
            form.addEventListener('submit', submitLeadForm);
        }

        async function submitLeadForm(e) {
            e.preventDefault();
            const name = document.getElementById('aics-lead-name').value;
            const email = document.getElementById('aics-lead-email').value;
            const phone = document.getElementById('aics-lead-phone').value;
            const message = document.getElementById('aics-lead-message').value;

            // Store visitor data for future messages
            visitor = { name, email, phone };

            try {
                const response = await fetch(`${apiOrigin}/api/businesses/${businessId}/leads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, message, conversationId: conversationId })
                });

                const data = await response.json();

                if (data.success) {
                    // Remove form and show success message
                    const formDiv = document.getElementById('aics-lead-form').parentElement;
                    formDiv.innerHTML = '<div>Thank you! We\'ve received your request and will get back to you soon.</div>';
                    
                    showingLeadForm = false;
                    inputField.disabled = false;
                    sendBtn.disabled = false;
                } else {
                    addMessage('Sorry, there was an error sending your request. Please try again.', 'ai');
                }
            } catch (error) {
                addMessage('Sorry, there was an error sending your request. Please try again.', 'ai');
            }
        }
    }

    // Initialize Widget
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAICSWidget);
    } else {
        initAICSWidget();
    }
})();
