/*
 * GET /api/instagram-followers → { "followers": 321, "updatedAt": "…", "stale": false }
 *
 * Renvoie le nombre d'abonnés du compte Instagram @startgen_lln via l'API officielle
 * d'Instagram. Le jeton reste côté serveur : variable d'environnement Netlify
 * IG_ACCESS_TOKEN (Site configuration → Environment variables, marquée « secret »).
 *
 * Garde-fous pour ne jamais inonder Instagram, même si le site reçoit beaucoup de visites :
 *  - destination fixe (aucune URL fournie par le visiteur) ;
 *  - réponse mise en cache par le CDN Netlify 15 min (partagée entre tous les visiteurs) ;
 *    les visiteurs reçoivent la copie en cache, Instagram n'est appelé qu'à son expiration ;
 *  - délai maximal par appel (4 s) et 2 tentatives au plus, espacées, seulement si Instagram
 *    est en panne ou ne répond pas (jamais si le jeton est refusé) ;
 *  - après un échec, pause de 5 min sans aucun appel : on renvoie le dernier chiffre connu ;
 *  - limite de 60 requêtes par minute et par IP sur cette adresse.
 */

const API_URL = 'https://graph.instagram.com/me';   // destination fixe

const env = (name) => globalThis.Netlify?.env?.get?.(name) ?? process.env[name];
const num = (name, def) => {
    const v = Number(env(name));
    return Number.isFinite(v) && v > 0 ? v : def;
};

// Réglages (les valeurs par défaut conviennent ; modifiables pour les tests)
const TIMEOUT_MS = () => num('IG_TIMEOUT_MS', 4000);
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = () => num('IG_RETRY_DELAY_MS', 1000);
const FRESH_MS = () => num('IG_CACHE_MS', 5 * 60 * 1000);   // mémoire de l'instance
const PAUSE_AFTER_FAILURE_MS = () => num('IG_PAUSE_MS', 5 * 60 * 1000);

// Mémoire de l'instance de la fonction (complète le cache du CDN)
let last = null;          // { followers, at }
let pausedUntil = 0;
let inFlight = null;      // un seul appel à Instagram à la fois par instance

class NoRetryError extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchFollowers(token) {
    const url = `${API_URL}?fields=followers_count&access_token=${encodeURIComponent(token)}`;
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS()), headers: { Accept: 'application/json' } });
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                // Jeton invalide ou expiré, permissions manquantes… : réessayer ne servirait à rien
                throw new NoRetryError(`Instagram a refusé la requête (HTTP ${res.status})`);
            }
            if (!res.ok) throw new Error(`Instagram indisponible (HTTP ${res.status})`);
            const data = await res.json();
            const n = data?.followers_count;
            if (!Number.isInteger(n) || n < 0) throw new NoRetryError('Réponse Instagram inattendue');
            return n;
        } catch (err) {
            lastError = err;
            if (err instanceof NoRetryError || attempt === MAX_ATTEMPTS) break;
            // Attente croissante avec un peu d'aléatoire avant la seule nouvelle tentative
            await sleep(RETRY_DELAY_MS() * attempt + Math.floor(Math.random() * 250));
        }
    }
    throw lastError;
}

const json = (body, status, cdnCache) => new Response(JSON.stringify(body), {
    status,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
        'Netlify-CDN-Cache-Control': cdnCache,
        'X-Content-Type-Options': 'nosniff',
    },
});
const fresh = (r, stale = false) => json(
    { followers: r.followers, updatedAt: new Date(r.at).toISOString(), stale },
    200,
    'public, durable, s-maxage=900, stale-while-revalidate=3600',
);
const unavailable = (reason) => json({ error: reason }, 503, 'public, durable, s-maxage=120');

export default async (req) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const token = env('IG_ACCESS_TOKEN');
    if (!token) return unavailable('Compteur Instagram non configuré');

    const now = Date.now();
    if (last && now - last.at < FRESH_MS()) return fresh(last);
    if (now < pausedUntil) return last ? fresh(last, true) : unavailable('Instagram momentanément indisponible');

    try {
        inFlight ??= fetchFollowers(token).finally(() => { inFlight = null; });
        const followers = await inFlight;
        last = { followers, at: Date.now() };
        return fresh(last);
    } catch (err) {
        pausedUntil = Date.now() + PAUSE_AFTER_FAILURE_MS();
        console.error(`[instagram-followers] ${err.message}`);   // le jeton n'est jamais journalisé
        return last ? fresh(last, true) : unavailable('Instagram momentanément indisponible');
    }
};

export const config = {
    path: '/api/instagram-followers',
    rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
