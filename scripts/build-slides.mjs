#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { readdir, cp, rm } from 'node:fs/promises'
import { join, basename } from 'node:path'

const SLIDES_DIR = 'content/slides'
const OUTPUT_DIR = 'public/slides-export'
const SLIDE_ASSETS_DIR = 'public/slides-assets'

async function buildSlides() {
  console.log('🔨 Building Slidev presentations...\n')

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
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
    const tempAssetsPath = join(SLIDES_DIR, 'assets')

    console.log(`📊 Building ${name}...`)

    // Copy assets to content/slides/assets temporarily if they exist
    let assetsCopied = false
    if (existsSync(assetsPath)) {
      console.log(`  📁 Copying assets for ${name}...`)
      await cp(assetsPath, tempAssetsPath, { recursive: true, force: true })
      assetsCopied = true
    }

    try {
      // Build slidev
      execSync(
        `pnpm exec slidev build "${inputPath}" --out "${outputPath}" --base /slides-export/${name}/`,
        { stdio: 'inherit' }
      )

      console.log(`  ✅ ${name} built successfully\n`)
    }
    catch (error) {
      console.error(`  ❌ Failed to build ${name}:`, error.message)
      process.exit(1)
    }
    finally {
      // Clean up temporary assets
      if (assetsCopied && existsSync(tempAssetsPath)) {
        await rm(tempAssetsPath, { recursive: true, force: true })
      }
    }
  }

  console.log('✨ All slides built successfully!')
}

buildSlides().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
