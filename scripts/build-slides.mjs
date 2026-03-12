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

    console.log(`📊 Building ${name}...`)

    try {
      // Build slidev
      execSync(
        `npx slidev build "${inputPath}" --out "${outputPath}" --base /slides-export/${name}/`,
        { stdio: 'inherit' }
      )

      // Copy assets if they exist
      if (existsSync(assetsPath)) {
        console.log(`  📁 Copying assets for ${name}...`)
        await cp(assetsPath, join(outputPath, 'assets'), { recursive: true })
      }

      console.log(`  ✅ ${name} built successfully\n`)
    }
    catch (error) {
      console.error(`  ❌ Failed to build ${name}:`, error.message)
      process.exit(1)
    }
  }

  console.log('✨ All slides built successfully!')
}

buildSlides().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
