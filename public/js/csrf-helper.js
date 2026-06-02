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
        const data = await response.json();
        if (data.success) {
            cachedCsrfToken = data.csrfToken;
            return cachedCsrfToken;
        }
    } catch (error) {
        console.warn('Error fetching CSRF token:', error);
    }
    return null;
}

// Fetch with CSRF token
async function fetchWithCsrf(url, options = {}) {
    const csrfToken = await getCsrfToken();
    const headers = options.headers || {};
    
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
        headers['X-CSRF-Token'] = csrfToken;
    }
    
    return fetch(url, {
        ...options,
        headers,
        credentials: 'include'
    });
}
