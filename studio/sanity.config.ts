import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID as string
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'galent',
  title: 'Galent Knowledge Hub',
  projectId,
  dataset,

  plugins: [
    structureTool({
      /* Posts are listed by the tab they belong to, mirroring how the
       * Knowledge Hub actually looks, so an editor can find a post the same
       * way a visitor would. "All posts" stays available for search. */
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Posts by tab')
              .child(
                S.documentTypeList('category')
                  .title('Hub tabs')
                  .defaultOrdering([{field: 'order', direction: 'asc'}])
                  .child((categoryId) =>
                    S.documentList()
                      .title('Posts')
                      .filter('_type == "post" && category._ref == $categoryId')
                      .params({categoryId})
                      .defaultOrdering([{field: 'order', direction: 'asc'}])
                      .initialValueTemplates([
                        S.initialValueTemplateItem('post-by-category', {categoryId}),
                      ])
                  )
              ),
            S.divider(),
            S.documentTypeListItem('post')
              .title('All posts')
              .child(
                S.documentTypeList('post')
                  .title('All posts')
                  .defaultOrdering([{field: 'order', direction: 'asc'}])
              ),
            S.documentTypeListItem('category').title('Hub tabs'),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev,
      {
        id: 'post-by-category',
        title: 'Post in this tab',
        schemaType: 'post',
        parameters: [{name: 'categoryId', type: 'string'}],
        value: ({categoryId}: {categoryId: string}) => ({
          category: {_type: 'reference', _ref: categoryId},
        }),
      },
    ],
  },
})
