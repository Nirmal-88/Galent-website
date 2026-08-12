import {defineType, defineField} from 'sanity'

/* A Knowledge Hub tab. The slug is what posts point at and what the
 * front-end uses as the panel id, so it must stay stable once published —
 * changing it re-homes every post in that tab. */
export const category = defineType({
  name: 'category',
  title: 'Hub category (tab)',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Tab label',
      description: 'Shown on the tab button on the Knowledge Hub. e.g. Blogs',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'ID (slug)',
      description:
        'Lower-case, hyphens. Used as the panel id in the page URL and CSS. Avoid changing this after publishing.',
      type: 'slug',
      options: {source: 'title', maxLength: 60},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Card CTA label',
      description: 'Button text on every card in this tab. e.g. Read blog, Request access',
      type: 'string',
      initialValue: 'Read',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Tab order',
      description: 'Lower numbers appear further left. Leave gaps (10, 20, 30) so you can insert later.',
      type: 'number',
      validation: (rule) => rule.required().integer(),
    }),
  ],
  orderings: [
    {
      title: 'Tab order',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],
  preview: {
    select: {title: 'title', subtitle: 'slug.current', order: 'order'},
    prepare: ({title, subtitle, order}) => ({
      title,
      subtitle: `${order ?? '—'} · ${subtitle ?? 'no slug'}`,
    }),
  },
})
