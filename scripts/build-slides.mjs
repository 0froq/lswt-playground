#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { readdir, cp, rm } from 'node:fs/promises'
import { join, basename, resolve } from 'node:path'
import { tmpdir } from 'node:os'

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

    // Create temp working directory
    const tempDir = join(tmpdir(), `slidev-build-${name}-${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })

    try {
      // Create package.json in temp dir
      const packageJson = {
        name: `slidev-build-${name}`,
        type: 'module',
        dependencies: {
          '@slidev/cli': '^52.2.5',
          '@slidev/theme-default': 'latest',
          'slidev-component-spotlight': '^1.1.0'
        }
      }
      await import('node:fs/promises').then(fs => 
        fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2))
      )

      // Copy slide markdown to temp dir
      const tempMdPath = join(tempDir, 'slides.md')
      await cp(inputPath, tempMdPath)

      // Copy assets to temp dir if they exist
      if (existsSync(assetsPath)) {
        console.log(`  📁 Copying assets for ${name}...`)
        await cp(assetsPath, join(tempDir, 'assets'), { recursive: true })
      }

      // Install dependencies
      console.log(`  📦 Installing dependencies...`)
      execSync('pnpm install', { cwd: tempDir, stdio: 'ignore' })

      // Build slidev in temp directory
      execSync(
        `pnpm exec slidev build slides.md --out "${resolve(outputPath)}" --base /slides-export/${name}/`,
        { 
          stdio: 'inherit',
          cwd: tempDir
        }
      )

      console.log(`  ✅ ${name} built successfully\n`)
    }
    catch (error) {
      console.error(`  ❌ Failed to build ${name}:`, error.message)
      process.exit(1)
    }
    finally {
      // Clean up temp directory
      if (existsSync(tempDir)) {
        await rm(tempDir, { recursive: true, force: true })
      }
    }
  }

  console.log('✨ All slides built successfully!')
}

buildSlides().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
