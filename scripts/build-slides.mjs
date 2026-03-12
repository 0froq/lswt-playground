#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cp, readdir, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'

const SLIDES_DIR = 'content/slides'
const OUTPUT_DIR = 'public/slides-export'
const SLIDE_ASSETS_DIR = 'public/slides-assets'
const BUILD_DIR = '.slidev-build'

async function buildSlides() {
  console.log('🔨 Building Slidev presentations...\n')

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // Create build directory (not in public/)
  if (!existsSync(BUILD_DIR)) {
    mkdirSync(BUILD_DIR, { recursive: true })
  }

  // Clean old builds
  const oldBuilds = await readdir(OUTPUT_DIR).catch(() => [])
  for (const dir of oldBuilds) {
    await rm(join(OUTPUT_DIR, dir), { recursive: true, force: true })
  }

  // Get all slide files
  const slideFiles = await readdir(SLIDES_DIR)
  const mdFiles = slideFiles.filter(f => f.endsWith('.md'))

  console.log(`Found ${mdFiles.length} slide files\n`)

  for (const file of mdFiles) {
    const name = basename(file, '.md')
    const inputPath = join(SLIDES_DIR, file)
    const outputPath = join(OUTPUT_DIR, name)
    const assetsPath = join(SLIDE_ASSETS_DIR, name)
    const buildWorkDir = join(BUILD_DIR, name)

    console.log(`📊 Building ${name}...`)

    // Create work directory for this slide
    if (!existsSync(buildWorkDir)) {
      mkdirSync(buildWorkDir, { recursive: true })
    }

    try {
      // Read and process markdown file
      let mdContent = readFileSync(inputPath, 'utf-8')
      
      // Replace relative asset paths with absolute paths
      // ../assets/gm_XXXXXX_assets/ -> /slides-assets/gm-YYYY-MM-DD/
      mdContent = mdContent.replace(
        /\.\.\/assets\/gm_\d+_assets\//g, 
        `/slides-assets/${name}/`
      )
      
      // Write processed markdown to work directory
      writeFileSync(join(buildWorkDir, 'slides.md'), mdContent)

      // Create vite config to disable public dir
      const viteConfig = `
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
})
`
      writeFileSync(join(buildWorkDir, 'vite.config.ts'), viteConfig)

      // Build slidev using project dependencies
      execSync(
        `pnpm exec slidev build slides.md --out "${outputPath}" --base /slides-export/${name}/`,
        { 
          stdio: 'inherit',
          cwd: buildWorkDir
        }
      )

      console.log(`  ✅ ${name} built successfully\n`)
    }
    catch (error) {
      console.error(`  ❌ Failed to build ${name}:`, error.message)
      process.exit(1)
    }
    finally {
      // Clean up work directory
      if (existsSync(buildWorkDir)) {
        await rm(buildWorkDir, { recursive: true, force: true })
      }
    }
  }

  // Clean up build directory
  if (existsSync(BUILD_DIR)) {
    await rm(BUILD_DIR, { recursive: true, force: true })
  }

  console.log('✨ All slides built successfully!')
}

buildSlides().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
