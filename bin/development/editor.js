import os from 'os'
import fs from 'fs'
import cp from 'child_process'
import path from 'path'

import api from './api.js'

let editor = null
const stackLine = ({ path, line, column }) => [path, line, column].join(':')

api.editor.observe(x => {
  try {
    goto(x)
  } catch (e) {
    api.log({ type: 'error', content: e })
  }
})

const editors = ({
  darwin: {
    zed: {
      name: 'Zed',
      path: '/Applications/Zed.app/Contents/MacOS/cli',
      args: stackLine
    },
    zedp: {
      name: 'Zed Preview',
      path: '/Applications/Zed Preview.app/Contents/MacOS/cli',
      args: stackLine
    },
    subl: {
      name: 'Sublime Text',
      path: '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl',
      args: stackLine
    },
    mvim: {
      name: 'Mac VIM',
      path: '/Applications/MacVim.app/Contents/bin/mvim',
      spawn: '/usr/bin/open',
      args: ({ path, line }) => ['mvim://open?url=file://' + encodeURI(encodeURI(path)) + '&line=' + line]
    },
    code: {
      name: 'VSCode',
      path: '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
      args: x => ['--goto', stackLine(x)]
    }
  },
  win32: {
    sublime: {
      name: 'Sublime Text',
      path: process.env.ProgramFiles + '\\Sublime Text\\sublime_text.exe',
      args: stackLine
    },
    sublime4: {
      name: 'Sublime Text 4',
      path: process.env.ProgramFiles + '\\Sublime Text 4\\sublime_text.exe',
      args: stackLine
    },
    sublime3: {
      name: 'Sublime Text 3',
      path: process.env.ProgramFiles + '\\Sublime Text 3\\sublime_text.exe',
      args: stackLine
    },
    code: {
      name: 'VSCode',
      path: process.env.LOCALAPPDATA + '\\Programs\\Microsoft VS Code\\Code.exe',
      args: x => ['--goto', stackLine(x)]
    }
  },
  linux: {

  }
})[os.platform()]

function goto(target) {
  const editor = findEditor()

  if (!editor)
    return

  cp.spawn(editor.spawn || editor.path, [].concat(editor.args(target)), {
    stdio: 'ignore',
    detached: true
  }).unref()
}

function findEditor() {
  if (editor || editor === false)
    return editor

  editor = process.env.EDITOR
    && envEditor()
    || editors[Object.keys(editors).find(editor => fs.existsSync(editors[editor].path))]

  if (!editor)
    throw new Error('Could not find any editor')

  if (editor && !fs.existsSync(editor.path))
    throw new Error('Could not find editor', name, 'at', editor.path)

  return editor
}

function envEditor() {
  const editor = editors[Object.keys(editors).find(e => editors[e].path === process.env.EDITOR)] || editors[path.basename(process.env.EDITOR)]
  return fs.existsSync(process.env.EDITOR)
    ? { args: editor ? editor.args : x => x.file, path: process.env.EDITOR }
    : editor
}
