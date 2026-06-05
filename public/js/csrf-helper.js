// CSRF Token Helper
let cachedCsrfToken = null;

// Fetch or get cached CSRF token
async function getCsrfToken() {
    if (cachedCsrfToken) {
        return cachedCsrfToken;
    }
    try {
        const response = await fetch('/api/csrf-token', {
            credentials: 'include'
        });
        if (!response.ok) {
            return null;
        }
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

// Fetch with CSRF token
async function fetchWithCsrf(url, options = {}) {
    try {
        const csrfToken = await getCsrfToken();
        
        // Create a new headers object by merging existing headers
        const headers = {
            ...(options.headers || {})
        };
        
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
            headers['X-CSRF-Token'] = csrfToken;
        }
        
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include'
        });
        
        return response;
    } catch (error) {
        throw error;
    }
}
