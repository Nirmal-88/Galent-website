/**
 * Decap CMS — GitHub OAuth callback (Vercel serverless function).
 *
 * GitHub redirects here after the editor authorises the app. We exchange
 * the temporary `code` for a permanent access token, then post the token
 * back to the parent window (the /admin/ page) via window.postMessage,
 * which is what Decap CMS listens for.
 */

export default async function handler(req, res) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).send('Missing OAuth env vars.');
    return;
  }

  const code = (req.query && req.query.code) || '';
  if (!code) {
    res.status(400).send('Missing ?code parameter.');
    return;
  }

  try {
    // Exchange the code for an access token.
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      const errBody = JSON.stringify({
        message: tokenData.error_description || tokenData.error || 'token_exchange_failed',
      });
      res.status(400).send(buildCallbackHTML('error', errBody));
      return;
    }

    const successBody = JSON.stringify({
      token: tokenData.access_token,
      provider: 'github',
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(buildCallbackHTML('success', successBody));
  } catch (err) {
    res
      .status(500)
      .send(buildCallbackHTML('error', JSON.stringify({ message: String(err) })));
  }
}

/**
 * Decap CMS expects the popup to post a message of the form:
 *   "authorization:github:<status>:<json-body>"
 * to its opener window.
 */
function buildCallbackHTML(status, jsonBody) {
  // Escape closing script tags inside the JSON to avoid breaking out.
  const safeBody = String(jsonBody).replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Authorising…</title></head>
<body>
<p style="font-family: system-ui, sans-serif; padding: 24px;">Finishing sign-in… you can close this window.</p>
<script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:${status}:' + ${JSON.stringify(safeBody)},
      e.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  if (window.opener) {
    window.opener.postMessage('authorizing:github', '*');
  }
})();
</script>
</body></html>`;
}
