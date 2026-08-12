/* Galent — Sanity connection settings.
 *
 * This is the ONLY file you need to touch to point the site at a different
 * Sanity project or dataset. Load it before sanity.js on every page that
 * shows CMS content.
 *
 * projectId is not a secret. It is visible in the browser on every request,
 * and reads against a public dataset need no token — which is exactly why the
 * site can fetch content directly from the browser with no server in between.
 * Never put a Sanity API *token* in this file: a token would grant write
 * access to anyone who views source.
 */
window.SANITY_CONFIG = {
  // From https://sanity.io/manage — the project's "Project ID".
  projectId: 'am365mmi',

  dataset: 'production',

  // Pinned on purpose. GROQ results are versioned by date; bumping this without
  // re-testing the queries in sanity.js can change their shape.
  apiVersion: '2024-10-01',
};
