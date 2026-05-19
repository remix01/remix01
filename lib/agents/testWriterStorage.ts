import fs from 'fs/promises'
import path from 'path'
import type { TestWritingResult } from './codexTestWriter'

export async function persistGeneratedTests(result: TestWritingResult, rootDir = process.cwd()): Promise<string> {
  const absolutePath = path.resolve(rootDir, result.testFilePath)
  const rel = path.relative(rootDir, absolutePath)

  if (rel.startsWith('..')) {
    throw new Error(`Refusing to write outside project root: ${result.testFilePath}`)
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, result.testCode, 'utf-8')
  return absolutePath
}
