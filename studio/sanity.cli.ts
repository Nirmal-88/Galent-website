import {defineCliConfig} from 'sanity/cli'

/* projectId / dataset are read from .env so the same config works for
 * whoever runs it. See studio/.env.example. */
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  /* Pinned so `sanity deploy` never prompts and always lands on the same URL
   * that editors have bookmarked: https://galent.sanity.studio */
  studioHost: 'galent',
  deployment: {
    appId: 'ab5ake4bqp70wzuiaflqhrrq',
  },
  autoUpdates: true,
})
