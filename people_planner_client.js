(function () {
    const SETTINGS_STORAGE_KEY = 'peoplePlannerSettingsEnc';
    const CRYPTO_KEY_STORAGE_KEY = 'peoplePlannerCryptoKey';

    function bytesToBase64(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    async function getOrCreateCryptoKey() {
        const existing = localStorage.getItem(CRYPTO_KEY_STORAGE_KEY);
        if (existing) {
            const jwk = JSON.parse(existing);
            return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
        }

        const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const jwk = await crypto.subtle.exportKey('jwk', key);
        localStorage.setItem(CRYPTO_KEY_STORAGE_KEY, JSON.stringify(jwk));
        return key;
    }

    async function encryptJson(value) {
        const key = await getOrCreateCryptoKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const plaintext = new TextEncoder().encode(JSON.stringify(value));
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

        return {
            v: 1,
            iv: bytesToBase64(iv),
            ct: bytesToBase64(new Uint8Array(ciphertext))
        };
    }

    async function decryptJson(payload) {
        const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (!parsed || typeof parsed !== 'object' || !parsed.iv || !parsed.ct) {
            throw new Error('Invalid encrypted payload');
        }

        const key = await getOrCreateCryptoKey();
        const iv = base64ToBytes(parsed.iv);
        const ct = base64ToBytes(parsed.ct);
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
        const json = new TextDecoder().decode(plaintext);
        return JSON.parse(json);
    }

    class PeoplePlannerClient {
        constructor(baseUrl) {
            this.baseUrl = (baseUrl || '').replace(/\/+$/, '');
            this.authorizationToken = null;
        }

        async post(path, body) {
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json;charset=UTF-8'
            };

            if (this.authorizationToken) {
                headers['Authorization'] = this.authorizationToken;
            }

            const resp = await fetch(this.baseUrl + path, {
                method: 'POST',
                headers,
                body: JSON.stringify(body || {})
            });

            if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                throw new Error(`PeoplePlanner request failed (${resp.status}): ${text || resp.statusText}`);
            }

            const newAuth = resp.headers.get('Authorization');
            if (newAuth) {
                const token = newAuth.toLowerCase().startsWith('bearer ') ? newAuth.split(/\s+/, 2)[1] : newAuth;
                this.authorizationToken = token;
            }

            const contentType = resp.headers.get('Content-Type') || '';
            if (contentType.toLowerCase().includes('application/json')) {
                return resp.json();
            }

            const text = await resp.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return text;
            }
        }

        async authenticate(email, password) {
            await this.post('/PortalAPI/V1/PortalEnablement/GetPortalEnablement', { email, password });
            await this.post('/PortalAPI/V1/ServiceUser/AuthenticateServiceUser', { email, password });
            try {
                await this.post('/PortalAPI/V1/Configuration/GetFeatureConfiguration', {});
            } catch (e) {
            }
            return true;
        }

        async getDuties(payload) {
            return this.post('/PortalAPI/V1/ServiceLocationDuty/GetDuties', payload);
        }
    }

    async function saveSettings(settings) {
        const trimmed = {
            baseUrl: (settings.baseUrl || '').trim(),
            email: (settings.email || '').trim(),
            password: settings.password || ''
        };

        const encrypted = await encryptJson(trimmed);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(encrypted));
        return true;
    }

    async function loadSettings() {
        const encrypted = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!encrypted) {
            return null;
        }
        return decryptJson(encrypted);
    }

    function clearSettings() {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }

    async function createAuthenticatedClientFromStorage() {
        const settings = await loadSettings();
        if (!settings || !settings.baseUrl || !settings.email || !settings.password) {
            throw new Error('PeoplePlanner settings not configured');
        }
        const client = new PeoplePlannerClient(settings.baseUrl);
        await client.authenticate(settings.email, settings.password);
        return client;
    }

    window.PeoplePlanner = {
        PeoplePlannerClient,
        saveSettings,
        loadSettings,
        clearSettings,
        createAuthenticatedClientFromStorage,
        SETTINGS_STORAGE_KEY,
        CRYPTO_KEY_STORAGE_KEY
    };
})();
