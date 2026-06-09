/**
 * Decap CMS — GitHub OAuth proxy (Vercel serverless function).
 *
 * Decap CMS hits /api/auth to start the GitHub OAuth flow. We redirect the
 * editor to GitHub's authorise URL. GitHub redirects back to /api/callback
 * with a temporary code; we exchange that code for an access token and
 * return it to the popup, which then talks to GitHub's REST API directly.
 *
 * Env vars required (set in Vercel dashboard → Project → Settings → Env):
 *   - OAUTH_GITHUB_CLIENT_ID
 *   - OAUTH_GITHUB_CLIENT_SECRET
 */

export default async function handler(req, res) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Missing OAUTH_GITHUB_CLIENT_ID env var.');
    return;
  }
  // Build the GitHub authorisation URL.
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const redirectUri = `${proto}://${host}/api/callback`;
  const scope = 'repo,user';
  const state = Math.random().toString(36).slice(2);

  const authUrl =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}`;

  res.writeHead(302, { Location: authUrl });
  res.end();
}
