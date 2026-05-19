import fs from 'fs/promises'
import path from 'path'
import type { TestWritingResult } from './codexTestWriter'

function isWithinRoot(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`)
}

export async function persistGeneratedTests(result: TestWritingResult, rootDir = process.cwd()): Promise<string> {
  if (!result.testFilePath?.trim()) {
    throw new Error('testFilePath is required')
  }

  const resolvedRoot = await fs.realpath(rootDir)
  const absolutePath = path.resolve(resolvedRoot, result.testFilePath)
  const rel = path.relative(resolvedRoot, absolutePath)
  const normalizedRel = rel.replace(/\\/g, '/')

  if (normalizedRel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside project root: ${result.testFilePath}`)
  }

  const isTestFile = /\.(test|spec)\.(c|m)?[jt]sx?$/i.test(path.basename(absolutePath))
  if (!isTestFile) {
    throw new Error(`Refusing to write non-test target: ${result.testFilePath}`)
  }

  const existing = await fs.lstat(absolutePath).catch(() => null)
  if (existing?.isSymbolicLink()) {
    throw new Error(`Refusing to overwrite symlink target: ${result.testFilePath}`)
  }
  if (existing?.isDirectory()) throw new Error(`Refusing to overwrite directory target: ${result.testFilePath}`)

  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  const resolvedParent = await fs.realpath(path.dirname(absolutePath))
  if (!isWithinRoot(resolvedRoot, resolvedParent)) {
    throw new Error(`Refusing to write through symlinked parent outside project root: ${result.testFilePath}`)
  }

  await fs.writeFile(absolutePath, result.testCode, 'utf-8')
  return absolutePath
}
