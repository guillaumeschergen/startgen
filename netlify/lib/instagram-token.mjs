/*
 * Jeton d'accès Instagram : lecture et renouvellement automatique.
 *
 * Les jetons « longue durée » d'Instagram expirent après 60 jours. Ils peuvent être
 * prolongés de 60 jours (s'ils ont plus de 24 h et ne sont pas expirés) via
 * https://graph.instagram.com/refresh_access_token.
 *
 * - Le jeton de départ est saisi par l'équipe dans Netlify (variable IG_ACCESS_TOKEN).
 * - La fonction planifiée instagram-token-refresh le renouvelle chaque semaine et range
 *   le nouveau jeton dans Netlify Blobs (stockage privé du site).
 * - Si l'équipe saisit un nouveau jeton dans Netlify, il remplace automatiquement
 *   celui du stockage (on mémorise l'empreinte du jeton d'origine, jamais le jeton en clair
 *   dans les journaux).
 *
 * Ce module ne fait aucun appel réseau tout seul : les fonctions lui passent le stockage
 * et `fetch`, ce qui permet de le tester avec des services simulés.
 */

export const REFRESH_URL = 'https://graph.instagram.com/refresh_access_token';   // destination fixe
export const STORE_NAME = 'instagram';
const KEY = 'token';
const DAY = 24 * 3600 * 1000;

export async function fingerprint(token) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function readSaved(store) {
    try {
        const saved = await store.get(KEY, { type: 'json' });
        return saved && typeof saved.token === 'string' ? saved : null;
    } catch {
        return null;   // stockage indisponible : on se rabat sur la variable d'environnement
    }
}

/** Jeton à utiliser : celui renouvelé s'il correspond toujours au jeton saisi et n'a pas expiré. */
export async function getToken({ store, envToken, now = Date.now() }) {
    if (!envToken) return null;
    if (!store) return envToken;
    const saved = await readSaved(store);
    if (saved && saved.seed === (await fingerprint(envToken)) && (!saved.expiresAt || saved.expiresAt > now)) {
        return saved.token;
    }
    return envToken;
}

class NoRetryError extends Error {}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Renouvelle le jeton si le dernier renouvellement date de plus de `minAgeMs`.
 * Un seul appel à Instagram (deux au plus si Instagram est en panne), avec délai maximal.
 * Retourne un statut sans jamais contenir le jeton.
 */
export async function refreshToken({
    store,
    envToken,
    fetchImpl = fetch,
    now = Date.now(),
    timeoutMs = 10000,
    retryDelayMs = 3000,
    minAgeMs = 6 * DAY,
    maxAttempts = 2,
}) {
    if (!envToken) return { status: 'skipped', reason: 'IG_ACCESS_TOKEN non défini' };
    if (!store) return { status: 'error', reason: 'stockage Netlify Blobs indisponible' };

    const seed = await fingerprint(envToken);
    let saved = await readSaved(store);
    if (saved && saved.seed !== seed) saved = null;   // un nouveau jeton a été saisi dans Netlify
    if (saved && now - saved.refreshedAt < minAgeMs) {
        return { status: 'skipped', reason: 'jeton renouvelé récemment', expiresAt: saved.expiresAt };
    }

    const current = saved ? saved.token : envToken;
    const url = `${REFRESH_URL}?grant_type=ig_refresh_token&access_token=${encodeURIComponent(current)}`;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                // Jeton expiré, trop récent (< 24 h) ou révoqué : inutile d'insister
                throw new NoRetryError(`Instagram a refusé le renouvellement (HTTP ${res.status})`);
            }
            if (!res.ok) throw new Error(`Instagram indisponible (HTTP ${res.status})`);
            const data = await res.json();
            if (typeof data?.access_token !== 'string' || !data.access_token || !Number.isFinite(data?.expires_in)) {
                throw new NoRetryError('Réponse de renouvellement inattendue');
            }
            const record = { token: data.access_token, seed, refreshedAt: now, expiresAt: now + data.expires_in * 1000 };
            await store.setJSON(KEY, record);
            return { status: 'refreshed', expiresAt: record.expiresAt, attempts: attempt };
        } catch (err) {
            lastError = err;
            if (err instanceof NoRetryError || attempt === maxAttempts) break;
            await sleep(retryDelayMs * attempt);
        }
    }
    return { status: 'error', reason: lastError?.message || 'erreur inconnue' };
}
