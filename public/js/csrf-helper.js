// CSRF Token Helper
let cachedCsrfToken = null;

// Fetch or get cached CSRF token
async function getCsrfToken() {
    console.log('[CSRF] getCsrfToken called, cached:', !!cachedCsrfToken);
    if (cachedCsrfToken) {
        console.log('[CSRF] Using cached token:', cachedCsrfToken.substring(0, 10) + '...');
        return cachedCsrfToken;
    }
    try {
        console.log('[CSRF] Fetching new token from /api/csrf-token');
        const response = await fetch('/api/csrf-token', {
            credentials: 'include'
        });
        console.log('[CSRF] /api/csrf-token response status:', response.status);
        if (!response.ok) {
            console.warn('[CSRF] /api/csrf-token not ok');
            return null;
        }
        const data = await response.json();
        console.log('[CSRF] /api/csrf-token data:', data);
        if (data.success && data.csrfToken) {
            cachedCsrfToken = data.csrfToken;
            console.log('[CSRF] Got new token:', cachedCsrfToken.substring(0, 10) + '...');
            return cachedCsrfToken;
        } else {
            console.warn('[CSRF] No token in /api/csrf-token response');
            return null;
        }
    } catch (error) {
        console.error('[CSRF] Error fetching token:', error);
    }
    return null;
}

// Fetch with CSRF token
async function fetchWithCsrf(url, options = {}) {
    console.log('[CSRF] fetchWithCsrf called for url:', url, 'with options:', options);
    try {
        const csrfToken = await getCsrfToken();
        console.log('[CSRF] CSRF token available:', !!csrfToken);
        
        // Create a new headers object by merging existing headers
        const headers = {
            ...(options.headers || {})
        };
        
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
            console.log('[CSRF] Adding X-CSRF-Token header');
            headers['X-CSRF-Token'] = csrfToken;
        }
        
        console.log('[CSRF] Final fetch options:', {
            ...options,
            headers,
            credentials: 'include'
        });
        
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include'
        });
        console.log('[CSRF] Fetch response status:', response.status);
        
        return response;
    } catch (error) {
        console.error('[CSRF] fetchWithCsrf error:', error);
        throw error;
    }
}
