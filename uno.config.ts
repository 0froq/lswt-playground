import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTagify,
  presetTypography,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  theme: {
    breakpoints: {
      sm: '600px',
      md: '900px',
    },
  },
  rules: [
    ['font-sans', { 'font-family': 'LXGW Neo ZhiSong' }],
    ['font-serif', { 'font-family': 'YshiPen-ShutiTC' }],
    ['font-mono', { 'font-family': 'LXGW Bright Code' }],
  ],
  shortcuts: [
  ],
  safelist: [
  ],
  content: {
    pipeline: {
      include: [
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html|css)($|\?)/,
      ],
    },
  },
  presets: [
    presetWind4(),
    presetAttributify({
      strict: true,
      prefixedOnly: true,
      prefix: 'un-',
    }),
    presetIcons({
      collections: {
        carbon: () => import('@iconify-json/carbon/icons.json', { with: { type: 'json' } }).then(i => i.default as any),
        ph: () => import('@iconify-json/ph/icons.json', { with: { type: 'json' } }).then(i => i.default as any),
      },
      scale: 1.2,
    }),
    presetTagify({
      prefix: 'un-',
    }),
    presetTypography(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
