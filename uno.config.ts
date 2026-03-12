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
    ['font-stylish', { 'font-family': 'Caveat' }],
    ['font-script', { 'font-family': 'Ephesis' }],
  ],
  shortcuts: {
    'page-content': 'mx-auto max-w-[800px] block px-10 min-w-0',
  },
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
        solar: () => import('@iconify-json/solar/icons.json', { with: { type: 'json' } }).then(i => i.default as any),
        openmj: () => import('@iconify-json/openmoji/icons.json', { with: { type: 'json' } }).then(i => i.default as any),
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
