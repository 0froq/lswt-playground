#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cp, readdir, rm } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

const SLIDES_DIR = 'content/slides'
const OUTPUT_DIR = 'public/slides-export'
const BUILD_WORK_DIR = '.slidev-build'
const BUILD_OUTPUT_DIR = join(BUILD_WORK_DIR, 'output')

async function buildSlides() {
  console.log('🔨 Building Slidev presentations...\n')

  // Create directories
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  if (!existsSync(BUILD_WORK_DIR)) {
    mkdirSync(BUILD_WORK_DIR, { recursive: true })
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
    const finalOutputPath = join(OUTPUT_DIR, name)
    const workDir = join(BUILD_WORK_DIR, 'work')

    console.log(`📊 Building ${name}...`)

    // Clean and create work directory
    if (existsSync(workDir)) {
      await rm(workDir, { recursive: true, force: true })
    }
    if (existsSync(BUILD_OUTPUT_DIR)) {
      await rm(BUILD_OUTPUT_DIR, { recursive: true, force: true })
    }
    mkdirSync(workDir, { recursive: true })

    try {
      // Read and process markdown file
      let mdContent = readFileSync(inputPath, 'utf-8')
      
      // Replace relative asset paths with absolute paths
      mdContent = mdContent.replace(
        /\.\.\/assets\/gm_\d+_assets\//g, 
        `/slides-assets/${name}/`
      )
      
      // Write processed markdown to work directory
      writeFileSync(join(workDir, 'slides.md'), mdContent)

      // Create vite config to disable public dir
      const viteConfig = `
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    outDir: '${resolve(BUILD_OUTPUT_DIR).replace(/\\\\/g, '/')}',
    emptyOutDir: true,
  },
})
`
      writeFileSync(join(workDir, 'vite.config.ts'), viteConfig)

      // Build slidev - output goes to BUILD_OUTPUT_DIR (outside of public/)
      execSync(
        `pnpm exec slidev build slides.md --base /slides-export/${name}/`,
        { 
          stdio: 'inherit',
          cwd: workDir
        }
      )

      // Move built files to final destination in public/
      if (existsSync(BUILD_OUTPUT_DIR)) {
        await cp(BUILD_OUTPUT_DIR, finalOutputPath, { recursive: true })
      }

      console.log(`  ✅ ${name} built successfully\n`)
    }
    catch (error) {
      console.error(`  ❌ Failed to build ${name}:`, error.message)
      process.exit(1)
    }
    finally {
      // Clean up work directory
      if (existsSync(workDir)) {
        await rm(workDir, { recursive: true, force: true })
      }
    }
  }

  // Clean up build directory
  if (existsSync(BUILD_WORK_DIR)) {
    await rm(BUILD_WORK_DIR, { recursive: true, force: true })
  }

  console.log('✨ All slides built successfully!')
}

buildSlides().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
