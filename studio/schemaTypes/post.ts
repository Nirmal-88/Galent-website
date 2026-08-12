import {defineType, defineField, defineArrayMember} from 'sanity'

/* One post = one document.
 *
 * This deliberately merges what used to be two separate objects in Decap
 * (the "Post" markdown file and the "Knowledge Hub" card entry). In Decap
 * they had to be created in pairs and kept in sync by hand, and a card
 * pointing at a missing slug was the single most common breakage. Here the
 * card fields and the essay body live on the same document, so they cannot
 * drift apart and publishing one thing publishes the whole post. */
export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'card', title: 'Hub card'},
    {name: 'media', title: 'Media'},
    {name: 'advanced', title: 'Advanced'},
  ],
  fields: [
    /* ---------- Content ---------- */
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      description:
        'The post URL: /post.html?slug=<this>. Changing it breaks existing links and shared URLs — avoid after publishing.',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description: '1–2 sentence preview. Shown on the Hub card, under the title on the post, and as the page meta description.',
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      description: 'The full article.',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Heading 4', value: 'h4'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Code', value: 'code'},
              {title: 'Strike', value: 'strike-through'},
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    validation: (rule) =>
                      rule.required().uri({scheme: ['http', 'https', 'mailto', 'tel']}),
                  }),
                ],
              }),
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          title: 'Image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              description: 'Describe the image for screen readers. Leave blank if purely decorative.',
              type: 'string',
            }),
            defineField({name: 'caption', title: 'Caption', type: 'string'}),
            defineField({
              name: 'variant',
              title: 'Display as',
              description:
                'Full width is the normal article image. Avatar renders a small round headshot, used for author portraits inside the body.',
              type: 'string',
              initialValue: 'full',
              options: {
                list: [
                  {title: 'Full width', value: 'full'},
                  {title: 'Avatar (round headshot)', value: 'avatar'},
                ],
                layout: 'radio',
              },
            }),
          ],
        }),
        defineArrayMember({
          type: 'object',
          name: 'table',
          title: 'Table',
          fields: [
            defineField({
              name: 'headerRows',
              title: 'Header rows',
              description: 'How many rows at the top are headers. Usually 1.',
              type: 'number',
              initialValue: 1,
            }),
            defineField({
              name: 'rows',
              title: 'Rows',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'row',
                  fields: [
                    defineField({
                      name: 'cells',
                      title: 'Cells',
                      type: 'array',
                      of: [defineArrayMember({type: 'string'})],
                    }),
                  ],
                  preview: {
                    select: {cells: 'cells'},
                    prepare: ({cells}) => ({title: (cells || []).join('  |  ') || 'Empty row'}),
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: {rows: 'rows'},
            prepare: ({rows}) => ({title: `Table — ${(rows || []).length} rows`}),
          },
        }),
        defineArrayMember({
          type: 'object',
          name: 'divider',
          title: 'Divider',
          fields: [
            defineField({
              name: 'style',
              type: 'string',
              initialValue: 'rule',
              options: {list: ['rule']},
              hidden: true,
            }),
          ],
          preview: {prepare: () => ({title: '— Divider —'})},
        }),
      ],
    }),

    /* ---------- Hub card ---------- */
    defineField({
      name: 'category',
      title: 'Category (tab)',
      description: 'Which Knowledge Hub tab this appears under.',
      type: 'reference',
      to: [{type: 'category'}],
      group: 'card',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind label',
      description: 'The small label printed on the card and above the post title.',
      type: 'string',
      group: 'card',
      initialValue: 'BLOG',
      options: {
        list: ['BLOG', 'WHITEPAPER', 'PRESS', 'CASE STUDY', 'ESSAY', 'FIELD NOTE', 'BRIEF', 'VIDEOCAST'],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'domain',
      title: 'Domain tag',
      type: 'string',
      group: 'card',
      initialValue: 'platform',
      options: {
        list: ['industry', 'delivery', 'platform', 'talent', 'governance', 'culture'],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'length',
      title: 'Length',
      description: 'Optional. Reading time or page count — e.g. 8 MIN or 32 PAGES. Blank shows nothing.',
      type: 'string',
      group: 'card',
    }),
    defineField({
      name: 'author',
      title: 'Author byline',
      description: 'Optional. e.g. BY ASHWIN BHARATH. Blank shows no byline.',
      type: 'string',
      group: 'card',
    }),
    defineField({
      name: 'order',
      title: 'Hub order',
      description:
        'Position within its tab — lower numbers appear first. Gaps of 10 are used so you can slot a post in between two others without renumbering everything.',
      type: 'number',
      group: 'card',
      validation: (rule) => rule.required().integer(),
    }),

    /* ---------- Media ---------- */
    defineField({
      name: 'cardImage',
      title: 'Card image',
      description: 'Thumbnail on the Hub listing. ~800×500. If blank, a coloured tile is used instead.',
      type: 'image',
      group: 'media',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
    }),
    defineField({
      name: 'bannerImage',
      title: 'Banner image',
      description: 'Hero banner at the top of the post itself. ~1600×900. Blank means no banner.',
      type: 'image',
      group: 'media',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
    }),
    defineField({
      name: 'thumbStyle',
      title: 'Thumb tint',
      description: 'Colour of the placeholder tile, used only when there is no card image.',
      type: 'string',
      group: 'media',
      initialValue: 'alt-1',
      options: {list: ['alt-1', 'alt-2', 'alt-3', 'alt-4', 'alt-5', 'alt-6']},
    }),
    defineField({
      name: 'embedUrl',
      title: 'Video / embed',
      description:
        'Optional. Paste a YouTube, Vimeo, Loom, Wistia, Spotify or SoundCloud link — or the whole <iframe> — and it renders as a player above the article.',
      type: 'string',
      group: 'media',
    }),
    defineField({
      name: 'embedTitle',
      title: 'Embed caption',
      description: 'Optional caption under the player. Also read by screen readers.',
      type: 'string',
      group: 'media',
      hidden: ({parent}) => !parent?.embedUrl,
    }),
    defineField({
      name: 'runtime',
      title: 'Runtime',
      description: 'Videocasts only. HH:MM — e.g. 22:14.',
      type: 'string',
      group: 'media',
    }),

    /* ---------- Advanced ---------- */
    defineField({
      name: 'migration',
      title: 'Migration metadata',
      description: 'Where this document came from. Kept for debugging and redirects; safe to ignore.',
      type: 'object',
      group: 'advanced',
      options: {collapsed: true, collapsible: true},
      fields: [
        defineField({name: 'sourceSystem', title: 'Source system', type: 'string', readOnly: true}),
        defineField({name: 'sourceId', title: 'Source id', type: 'string', readOnly: true}),
        defineField({name: 'legacyUrl', title: 'Legacy URL', type: 'string', readOnly: true}),
        defineField({name: 'migratedAt', title: 'Migrated at', type: 'datetime', readOnly: true}),
        defineField({
          name: 'notes',
          title: 'Conversion warnings',
          type: 'array',
          of: [defineArrayMember({type: 'string'})],
          readOnly: true,
        }),
      ],
    }),
  ],

  orderings: [
    {
      title: 'Hub order',
      name: 'hubOrder',
      by: [{field: 'order', direction: 'asc'}],
    },
    {
      title: 'Title A→Z',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],

  preview: {
    select: {
      title: 'title',
      kind: 'kind',
      category: 'category.title',
      order: 'order',
      media: 'cardImage',
    },
    prepare: ({title, kind, category, order, media}) => ({
      title,
      subtitle: [order, kind, category].filter(Boolean).join(' · '),
      media,
    }),
  },
})
