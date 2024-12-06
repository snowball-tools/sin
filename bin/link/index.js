import Path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

import config from '../config.js'
import { safeId } from '../shared.js'

const p = console.log // eslint-disable-line
const sinx = process.platform === 'win32' && Path.join(import.meta.dirname, 'sinx.exe')

if (config._.length) {
  const pkg = JSON.parse(await fs.readFile('package.json'))
  for (const name of config._) {
    const target = Path.join(config.linkDir, name)
    if (!existsSync(target))
      throw new Error(name + ' not found - did you link it?')
    const path = Path.join('node_modules', '.sin', safeId({ name: name, version: 'link:' + name }), 'node_modules', name)
    await symlink(target, path)
    await symlink(path.slice(13), Path.join('node_modules', name))
    p('🔥 Linked ' + name)
    name in (pkg.devDependencies || {})
      ? pkg.devDependencies[name] = 'link:' + name
      : name in (pkg.optionalDependencies || {})
      ? pkg.optionalDependencies[name] = 'link:' + name
      : name in (pkg.peerDependencies || {})
      ? pkg.peerDependencies[name] = 'link:' + name
      : name in (pkg.dependencies || {})
      ? pkg.dependencies[name] = 'link:' + name
      : pkg.dependencies = sort({ ...pkg.dependencies || {}, [name]: 'link:' + name })
    await fs.writeFile('package.json', JSON.stringify(pkg, null, 2))
  }
} else {
  const pkg = JSON.parse(await fs.readFile('package.json'))
  await fs.mkdir(config.linkDir, { recursive: true })
  await symlink(config.cwd, Path.join(config.linkDir, pkg.name))

  await Promise.all(Object.entries(
    typeof pkg.bin === 'string'
    ? { [pkg.name.split('/').pop()]: pkg.bin }
    : pkg.bin || {}
  ).map(async([name, file]) => {
    const target = Path.join(config.cwd, file)
    const path = Path.join(config.binDir, name)
    if (sinx) {
      await fs.mkdir(config.binDir, { recursive: true })
      await fs.writeFile(path, 'node "' + target + '"')
      await fs.copyFile(sinx, Path.join(config.binDir, name + '.exe'))
    } else {
      await symlink(target, path)
      await fs.chmod(target, 0o766)
    }
  }))

  p('🔥 Linked as ' + pkg.name)
}

async function symlink(target, path) {
  try {
    await fs.mkdir(Path.dirname(path), { recursive: true })
    await fs.symlink(target, path, 'junction')
  } catch (_) {
    await fs.rm(path, { recursive: true })
    await fs.symlink(target, path, 'junction')
  }
}

function sort(x) {
  return Object.fromEntries(Object.entries(x).sort(([a], [b]) => a > b ? 1 : a < b ? -1 : 0))
}
