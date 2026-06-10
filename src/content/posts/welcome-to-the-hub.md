---
title: "Welcome to the Knowledge Hub"
excerpt: "An example post showing how new essays are authored entirely from the admin panel — no code touched."
kind: "ESSAY"
length: "2 MIN"
author: "BY THE GALENT TEAM"
domain: "platform"
---

This is an example post written entirely through the Galent admin panel. Editors
log into `/admin/`, open **Posts**, click **New Post**, and write the body in a
proper rich-text editor — bold, italics, headings, lists, links, images.

## What you get

A few things worth flagging:

- The post lives as a single Markdown file in `src/content/posts/`.
- When you click **Publish**, the file is committed to GitHub on your behalf.
- Vercel redeploys, and the post is reachable at `/post.html?slug=<filename>`.

## Linking it from the Hub

A new post doesn't automatically appear in the Hub listing. To surface it on
`/knowledge-hub.html`:

1. Open **Knowledge Hub** in the admin.
2. Click **+ Add items** at the top of the items list.
3. Fill in title, excerpt, category, etc.
4. Set the **Link target** field to `post.html?slug=<filename>` (matching the
   filename of your post — minus the `.md`).
5. Click **Publish**.

That's the two-step flow for now. If you'd rather have the Hub auto-list every
post in the `posts/` folder, that's a small addition.

## Markdown cheatsheet

You can write things like:

- `**bold**` becomes **bold**
- `*italics*` becomes *italics*
- `[link text](https://example.com)` becomes [link text](https://example.com)
- `## Heading` becomes a section heading
- `- item` becomes a bullet
- `> quote` becomes a pull quote

The admin's visual editor handles all of this for you — you don't have to memorise
the syntax. The above is just here for reference.

---

Delete this post when you're done with it. It exists only as a starter so you
can see the system end-to-end.
