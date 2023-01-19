import os from 'os'
import fs from 'fs'
import cp from 'child_process'
import path from 'path'

let editor = null
const stackLine = ({ path, line, column }) => [path, line, column].join(':')

const editors = ({
  darwin: {
    subl: {
      path: '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl',
      args: stackLine
    },
    mvim: {
      path: '/Applications/MacVim.app/Contents/bin/mvim',
      args: ({ path, line }) => [`+${line}`, path]
    },
    code: {
      path: '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
      args: x => ['--goto', stackLine(x)]
    },
    atom: {
      path: '/Applications/Atom.app/Contents/MacOS/Atom',
      args: stackLine
    }
  },
  win32: {
    sublime: {
      path: process.env.ProgramFiles + '\\Sublime Text\\sublime_text.exe',
      args: stackLine
    },
    code: {
      path: process.env.LOCALAPPDATA + '\\Programs\\Microsoft VS Code\\Code.exe',
      args: x => ['--goto', stackLine(x)]
    },
    atom: {
      path: process.env.LOCALAPPDATA + '\\atom\\atom.exe',
      args: stackLine
    }
  },
  linux: {

  }
})[os.platform()]

export default function(target, name) {
  findEditor(name) && cp.spawn(editor.path, [].concat(editor.args(target)), {
    stdio: 'ignore',
    detached: true
  }).unref()
}

function findEditor(name) {
  if (editor || editor === false)
    return editor

  editor = name
    ? editors[name]
    : process.env.EDITOR
    ? envEditor()
    : editors[Object.keys(editors).find(editor => fs.existsSync(editors[editor].path))]

  if (!editor)
    return console.log('Could not find any editor') // eslint-disable-line

  if (editor && !fs.existsSync(editor.path))
    return console.log('Could not find editor', name, 'at', editor.path) // eslint-disable-line

  return editor
}

function envEditor() {
  const editor = editors[Object.keys(editors).find(e => editors[e].path === process.env.EDITOR)] || editors[path.basename(process.env.EDITOR)]
  return fs.existsSync(process.env.EDITOR)
    ? { args: editor ? editor.args : x => x.file, path: process.env.EDITOR }
    : editor
}
