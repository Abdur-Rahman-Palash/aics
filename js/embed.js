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
            .aics-suggested-header { font-size: 13px; color: #666; padding: 16px 16px 0 16px; margin: 0; background: #f5f7fa; flex-shrink: 0; min-width: 0; }
            .aics-suggested-questions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding: 0 16px 16px 16px; background: #f5f7fa; border-bottom: 1px solid #e0e0e0; flex-shrink: 0; min-width: 0; }
            .aics-suggested-btn { background: white; border: 1px solid #667eea; color: #667eea; padding: 8px 12px; border-radius: 16px; font-size: 13px; cursor: pointer; transition: all 0.2s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; flex-shrink: 0; }
            .aics-suggested-btn:hover { background: #667eea; color: white; }
            .aics-suggested-btn:active { transform: scale(0.95); }
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

        // Append to DOM
        document.body.appendChild(floatBtn);
        document.body.appendChild(chatContainer);

        // Get Elements
        const messagesContainer = document.getElementById('aics-messages');
        const inputField = document.getElementById('aics-input');
        const sendBtn = document.getElementById('aics-send');
        const closeBtn = chatContainer.querySelector('.aics-close-btn');
        const suggestedContainer = document.getElementById('aics-suggested');
        const chatHeader = chatContainer.querySelector('.aics-chat-header');
        
        // Drag state
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        suggestedContainer.innerHTML = `
            <button class="aics-suggested-btn">What are your business hours?</button>
            <button class="aics-suggested-btn">Do you offer refunds?</button>
            <button class="aics-suggested-btn">How can I contact support?</button>
        `;

        // Attach Event Listeners
        floatBtn.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', toggleChat);
        sendBtn.addEventListener('click', sendMessage);
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
        function addMessage(text, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `aics-message ${type}`;
            messageDiv.textContent = text;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        async function sendMessageFromSuggestion(question) {
            inputField.value = question;
            sendMessage();
        }
        async function sendMessage() {
            const message = inputField.value.trim();
            if (!message) return;
            addMessage(message, 'user');
            inputField.value = '';
            sendBtn.disabled = true;
            showTypingIndicator();

            const apiOrigin = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
            const apiUrl = `${apiOrigin}/api/chat`;
            const payload = { message };
            if (businessId) {
                payload.businessId = businessId;
            }

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                hideTypingIndicator();
                addMessage(data.success ? data.response : 'Sorry, something went wrong.', 'ai');
            } catch (err) {
                hideTypingIndicator();
                addMessage('Sorry, check internet connection.', 'ai');
            }
            sendBtn.disabled = false;
        }
        // Add listeners to suggested buttons
        const suggestedButtons = suggestedContainer.querySelectorAll('.aics-suggested-btn');
        suggestedButtons.forEach(btn => btn.addEventListener('click', (e) => sendMessageFromSuggestion(e.target.textContent)));
    }

    // Initialize Widget
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAICSWidget);
    } else {
        initAICSWidget();
    }
})();
