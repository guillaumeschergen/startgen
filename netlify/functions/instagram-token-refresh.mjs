/*
 * Fonction planifiée : renouvelle chaque lundi à 4 h (UTC) le jeton Instagram utilisé par
 * le compteur d'abonnés. Un jeton dure 60 jours : une semaine manquée ou une panne
 * d'Instagram laisse donc largement le temps de réessayer la semaine suivante.
 *
 * Netlify n'expose pas les fonctions planifiées par une URL publique : un visiteur ne peut
 * pas la déclencher. On peut la lancer à la main dans Netlify (Functions → Run now).
 */
import { getStore } from '@netlify/blobs';
import { refreshToken, STORE_NAME } from '../lib/instagram-token.mjs';

const env = (name) => globalThis.Netlify?.env?.get?.(name) ?? process.env[name];

export default async () => {
    let store = null;
    try { store = getStore({ name: STORE_NAME, consistency: 'strong' }); } catch { /* voir statut */ }
    const result = await refreshToken({ store, envToken: env('IG_ACCESS_TOKEN') });
    const until = result.expiresAt ? ` (valable jusqu'au ${new Date(result.expiresAt).toISOString().slice(0, 10)})` : '';
    const line = `[instagram-token-refresh] ${result.status}${result.reason ? ' : ' + result.reason : ''}${until}`;
    (result.status === 'error' ? console.error : console.log)(line);   // jamais le jeton
};

export const config = { schedule: '0 4 * * 1' };
