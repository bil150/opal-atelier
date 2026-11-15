/**
 * Runs Vitest from a working directory whose Windows drive letter is upper-case.
 *
 * Some terminals (VS Code among them) start in "d:\…" while Node resolves modules as "D:\…".
 * Vitest then loads two copies of itself and every suite fails with
 * "Vitest failed to find the current suite". Elsewhere this is a plain pass-through.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const cwd = process.cwd().replace(/^[a-z]:/, (drive) => drive.toUpperCase())
const require = createRequire(resolve(cwd, 'package.json'))
const vitestBin = resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')

const { status } = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
})
process.exit(status ?? 1)
