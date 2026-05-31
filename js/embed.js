// AICS - Embed Widget Script
// Copy this script and paste anywhere on your website!
// Example usage:
/*
<script src="https://your-domain.com/js/embed.js" data-widget-id="default"></script>
*/

(function() {
    // Inject Chat Widget
    function initAICSWidget() {
        // Inject Styles
        const css = `
            .aics-float-btn { position: fixed; bottom: 24px; right: 24px; width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4); cursor: pointer; font-size: 28px; z-index: 999999; transition: transform 0.2s; }
            .aics-float-btn:hover { transform: scale(1.1); }
            .aics-chat-container { position: fixed; bottom: 100px; right: 24px; width: 90%; max-width: 420px; height: 600px; border-radius: 20px; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15); z-index: 999998; display: none; background: white; flex-direction: column; overflow: hidden; }
            @media (max-width: 480px) { .aics-chat-container { right: 12px; left: 12px; bottom: 88px; width: auto; max-width: 100%; height: 70vh; } }
            .aics-chat-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; color: white; }
            .aics-header-title { display: flex; align-items: center; gap: 12px; }
            .aics-avatar { width: 40px; height: 40px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
            .aics-title-text h3 { margin: 0; font-size: 18px; font-weight: 600; }
            .aics-title-text p { margin: 0; font-size: 12px; opacity: 0.9; }
            .aics-close-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
            .aics-chat-messages { flex: 1; padding: 16px; overflow-y: auto; background: #f5f7fa; display: flex; flex-direction: column; gap: 12px; }
            .aics-message { max-width: 80%; padding: 12px 16px; border-radius: 18px; line-height: 1.5; }
            .aics-message.user { align-self: flex-end; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-bottom-right-radius: 4px; }
            .aics-message.ai { align-self: flex-start; background: white; color: #333; border-bottom-left-radius: 4px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
            .aics-typing-indicator { display: flex; gap: 4px; padding: 12px 16px; }
            .aics-typing-indicator span { width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: aics-bounce 1.4s infinite ease-in-out both; }
            .aics-typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
            .aics-typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
            @keyframes aics-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
            .aics-chat-input { padding: 16px; background: white; border-top: 1px solid #e0e0e0; display: flex; gap: 12px; }
            .aics-chat-input input { flex: 1; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 24px; font-size: 14px; outline: none; transition: border-color 0.2s; }
            .aics-chat-input input:focus { border-color: #667eea; }
            .aics-send-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; color: white; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-size: 16px; }
            .aics-suggested-header { font-size: 13px; color: #666; padding: 16px 16px 0; margin: 0; background: #f5f7fa; }
            .aics-suggested-questions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding: 0 16px 16px; background: #f5f7fa; border-bottom: 1px solid #e0e0e0; }
            .aics-suggested-btn { background: white; border: 1px solid #667eea; color: #667eea; padding: 8px 12px; border-radius: 16px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
            .aics-suggested-btn:hover { background: #667eea; color: white; }
        `;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);

        // Create Elements
        const floatBtn = document.createElement('button');
        floatBtn.className = 'aics-float-btn';
        floatBtn.innerHTML = '💬';

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

        // Helper Functions
        function toggleChat() {
            const isOpen = chatContainer.style.display === 'flex';
            chatContainer.style.display = isOpen ? 'none' : 'flex';
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
            typingDiv.className = 'aics-message ai aics-typing-indicator';
            typingDiv.id = 'aics-typing';
            typingDiv.innerHTML = '<span></span><span></span><span></span>';
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
            // TODO: Call your server endpoint here!
            // Replace 'http://localhost:3000/api/chat' with your actual domain in production!
            try {
                const response = await fetch('http://localhost:3000/api/chat', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message })
                });
                const data = await response.json();
                hideTypingIndicator();
                addMessage(data.success ? data.response : 'Sorry, something went wrong.', 'ai');
            } catch (err) { hideTypingIndicator(); addMessage('Sorry, check internet connection.', 'ai'); }
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
