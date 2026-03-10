import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
      }),
    }),
    autopsia: defineCollection({
      type: 'page',
      source: '000_autopsia/*.md',
    }),
    slides: defineCollection({
      type: 'page',
      source: 'slides/*.md',
      schema: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        date: z.string().optional(),
      }),
    }),
  },
})
