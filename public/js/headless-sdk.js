/**
 * AICS Headless JS SDK
 * Exposes class AICSHeadless to handle message dispatch, file upload, lead submission, history retrieval, and websocket callbacks.
 */
class AICSHeadless {
    constructor(config = {}) {
        if (!config.businessId) {
            throw new Error('businessId is required to initialize AICSHeadless');
        }
        this.businessId = config.businessId;
        this.apiOrigin = config.apiOrigin || window.location.origin;
        this.socketUrl = config.socketUrl || this.apiOrigin;
        this.conversationId = config.conversationId || localStorage.getItem(`aics_conv_${this.businessId}`) || this.generateUuid();
        localStorage.setItem(`aics_conv_${this.businessId}`, this.conversationId);
        
        this.socket = null;
        this.onMessageCallback = null;
        this.onTypingCallback = null;
        this.onErrorCallback = null;
        this.heartbeatInterval = null;
        
        if (config.autoConnect !== false) {
            this.connect();
        }
    }
    
    generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    connect() {
        if (typeof io === 'undefined') {
            const script = document.createElement('script');
            script.src = `${this.apiOrigin}/socket.io/socket.io.js`;
            script.onload = () => this.initSocket();
            document.head.appendChild(script);
        } else {
            this.initSocket();
        }
    }
    
    initSocket() {
        this.socket = io(this.socketUrl);
        
        this.socket.on('connect', () => {
            this.sendHeartbeat();
            this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000); // 30s
        });
        
        this.socket.on('ai response', (data) => {
            if (this.onMessageCallback) {
                this.onMessageCallback(data);
            }
        });
        
        this.socket.on('disconnect', () => {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
        });
    }
    
    sendHeartbeat() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('visitor-active', {
                businessId: this.businessId,
                url: window.location.href,
                title: document.title,
                referrer: document.referrer,
                userAgent: navigator.userAgent
            });
        }
    }
    
    async getHistory() {
        const response = await fetch(`${this.apiOrigin}/api/chat/history?businessId=${this.businessId}&conversationId=${this.conversationId}`);
        return await response.json();
    }
    
    async sendMessage(message, visitor = {}) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('send message', {
                message,
                businessId: this.businessId,
                conversationId: this.conversationId,
                visitor
            });
        } else {
            // Fallback to REST API
            const response = await fetch(`${this.apiOrigin}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    businessId: this.businessId,
                    conversationId: this.conversationId,
                    visitor
                })
            });
            const data = await response.json();
            if (this.onMessageCallback) {
                this.onMessageCallback(data);
            }
            return data;
        }
    }
    
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('businessId', this.businessId);
        formData.append('conversationId', this.conversationId);
        
        const response = await fetch(`${this.apiOrigin}/api/upload`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    }
    
    async submitLead(leadData) {
        const response = await fetch(`${this.apiOrigin}/api/businesses/${this.businessId}/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...leadData,
                conversationId: this.conversationId
            })
        });
        return await response.json();
    }
    
    onMessage(callback) {
        this.onMessageCallback = callback;
    }
    
    onTyping(callback) {
        this.onTypingCallback = callback;
    }
    
    onError(callback) {
        this.onErrorCallback = callback;
    }
}

// Export for browser or Node environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AICSHeadless;
} else {
    window.AICSHeadless = AICSHeadless;
}
