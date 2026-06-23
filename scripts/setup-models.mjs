import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const packageJsonPath = join(projectRoot, 'package.json')
const modelsDir = join(projectRoot, 'public', 'models')
const tempDir = join(projectRoot, '.tmp-models')
const markerFile = join(modelsDir, 'resources.json')

function getPackageVersion() {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const version = packageJson.dependencies?.['@imgly/background-removal']

  if (!version) {
    throw new Error('No se encontró @imgly/background-removal en package.json')
  }

  return version.replace(/^\^|~/, '')
}

async function copyDirectory(source, destination) {
  await mkdir(destination, { recursive: true })

  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name)
    const destinationPath = join(destination, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath)
    } else {
      await copyFile(sourcePath, destinationPath)
    }
  }
}

async function main() {
  if (existsSync(markerFile)) {
    console.log('Modelos ya presentes en public/models/.')
    return
  }

  const version = getPackageVersion()
  const url = `https://staticimgly.com/@imgly/background-removal-data/${version}/package.tgz`

  rmSync(tempDir, { recursive: true, force: true })
  mkdirSync(tempDir, { recursive: true })

  const archivePath = join(tempDir, 'package.tgz')
  console.log(`Descargando modelos IMG.LY v${version}...`)

  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`No se pudo descargar ${url} (${response.status})`)
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(archivePath))
  execFileSync('tar', ['-xzf', archivePath, '-C', tempDir], { stdio: 'inherit' })

  const extractedDist = join(tempDir, 'package', 'dist')
  if (!existsSync(extractedDist)) {
    throw new Error('El paquete descargado no contiene package/dist')
  }

  rmSync(modelsDir, { recursive: true, force: true })
  await copyDirectory(extractedDist, modelsDir)
  rmSync(tempDir, { recursive: true, force: true })

  console.log('Modelos instalados en public/models/.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
