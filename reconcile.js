export function nonKeyed(parent, next, diff, remove, keys, removing, dom, after = null) { // eslint-disable-line
  let i = 0
    , temp
    , view

  while (i < next.length) {
    if (!removing.has(dom)) {
      view = next[i]
      temp = dom !== after
        ? diff(dom, view, parent)
        : diff(null, view)
      dom === after && parent.insertBefore(temp.dom, after)
      keys && (
        keys.rev[view.key] = i,
        keys[i] = Ref(view, temp)
      )
      dom = temp.last
      i++
    }
    dom && (dom = dom.nextSibling)
  }

  while (dom !== after) {
    temp = dom.nextSibling
    remove(dom, parent)
    dom = temp
  }
}

export function keyed(parent, current, next, diff, remove, keys, removing, before, after = null, arrays) { // eslint-disable-line
  let node
    , temp
    , i = current.length
    , prevStart = 0
    , newStart = 0
    , loop = true
    , prevEnd = current.length - 1
    , newEnd = next.length - 1
    , a
    , b
    , prevStartNode = before && before.nextSibling || parent.firstChild
    , newStartNode = prevStartNode
    , prevEndNode = after && after.previousSibling || parent.lastChild

  const last = prevStartNode

  arrays.has(prevEndNode) && (prevEndNode = arrays.get(prevEndNode))

  fixes: while (loop) {
    loop = false

    // Skip prefix
    a = current[prevStart]
    b = next[newStart]
    while (a.key === b.key) {
      temp = diff(prevStartNode, b, parent)
      keys[newStart] = Ref(b, temp)
      prevStart++
      newStart++
      newStartNode = prevStartNode = temp.last.nextSibling
      if (prevEnd < prevStart || newEnd < newStart) break fixes
      a = current[prevStart]
      b = next[newStart]
    }

    // Skip suffix
    a = current[prevEnd]
    b = next[newEnd]
    while (a.key === b.key) {
      temp = diff(prevEndNode, b, parent)
      keys[newEnd] = Ref(b, temp)
      prevEnd--
      newEnd--
      after = prevEndNode
      prevEndNode = temp.first.previousSibling
      arrays.has(prevEndNode) && (prevEndNode = arrays.get(prevEndNode))
      if (prevEnd < prevStart || newEnd < newStart) break fixes
      a = current[prevEnd]
      b = next[newEnd]
    }

    // Fast path to swap backward
    a = current[prevEnd]
    b = next[newStart]
    while (a.key === b.key) {
      loop = true
      node = prevEndNode.previousSibling
      temp = diff(prevEndNode, b, parent)
      keys[newStart] = Ref(b, temp)
      insertBefore(parent, temp, newStartNode)
      prevEndNode = arrays.has(node) ? arrays.get(node) : node
      newStart++
      prevEnd--
      if (prevEnd < prevStart || newEnd < newStart) break fixes
      a = current[prevEnd]
      b = next[newStart]
    }

    // Fast path to swap forward
    a = current[prevStart]
    b = next[newEnd]
    while (a.key === b.key) {
      loop = true
      temp = diff(prevStartNode, b, parent)
      keys[newEnd] = Ref(b, temp)
      node = temp.last.nextSibling
      insertBefore(parent, temp, after)
      prevStart++
      after = temp.last
      prevStartNode = node
      newEnd--
      if (prevEnd < prevStart || newEnd < newStart) break fixes
      a = current[prevStart]
      b = next[newEnd]
    }
  }

  // Fast path for shrink
  if (newEnd < newStart) {
    if (prevStart <= prevEnd) {
      while (prevStart <= prevEnd) {
        if (prevEnd === 0) {
          remove(prevEndNode, parent) && prevEnd--
        } else {
          temp = prevEndNode.previousSibling
          remove(prevEndNode, parent) && prevEnd--
          prevEndNode = arrays.has(temp) ? arrays.get(temp) : temp
        }
      }
    }
    return keys
  }

  // Fast path for add
  if (prevEnd < prevStart) {
    if (newStart <= newEnd) {
      while (newStart <= newEnd) {
        b = next[newStart]
        node = diff(null, b)
        keys[newStart] = Ref(b, node)
        parent.insertBefore(node.dom, after)
        newStart++
      }
    }
    return keys
  }

  // Positions for reusing nodes from current DOM state
  const P = new Array(newEnd + 1 - newStart)
  for (i = newStart; i <= newEnd; i++) P[i] = -1

  // Index to resolve position from current to new
  const I = new Map()
  for (i = newStart; i <= newEnd; i++) I.set(next[i].key, i)

  let reusingNodes = newStart + next.length - 1 - newEnd
  const toRemove = []

  for (i = prevStart; i <= prevEnd; i++) {
    if (I.has(current[i].key)) {
      P[I.get(current[i].key)] = i
      reusingNodes++
    } else {
      toRemove.push(i)
    }
  }

  // Fast path for full replace
  if (reusingNodes === 0) {
    node = before && before.nextSibling || parent.firstChild

    while (node) {
      temp = node.nextSibling
      remove(node, parent) && prevStart++
      node = temp !== last && temp
    }

    for (i = newStart; i <= newEnd; i++) {
      b = next[i]
      node = diff(null, b)
      keys[i] = Ref(b, node)
      parent.insertBefore(node.dom, after)
    }

    return keys
  }

  // What else?
  const longestSeq = longestPositiveIncreasingSubsequence(P, newStart)

  // Collect nodes to work with them
  const nodes = []

  temp = prevStartNode
  for (i = prevStart; i <= prevEnd; i++) {
    nodes[i] = temp
    temp = temp.nextSibling
  }

  i = 0
  while (i < toRemove.length)
    remove(nodes[toRemove[i]], parent) && i++

  let lisIdx = longestSeq.length - 1

  for (i = newEnd; i >= newStart; i--) {
    if (longestSeq[lisIdx] === i) {
      after = nodes[P[longestSeq[lisIdx]]]
      diff(after, next[i], parent)
      lisIdx--
    } else {
      if (P[i] === -1) {
        temp = diff(null, next[i])
        parent.insertBefore(temp.dom, after)
      } else {
        temp = diff(nodes[P[i]], next[i], parent)
        insertBefore(parent, temp, after)
      }

      after = temp.last
    }
  }

  return keys
}

function insertBefore(parent, x, after) {
  let first = x.first
    , temp

  after === x.first && (after = null)

  do {
    temp = first.nextSibling
    p('yas', first && first.nodeValue || first, after && after.nodeValue || after)
    parent.insertBefore(first, after)
    first = first === x.last ? null : temp
  } while (first)

  return x
}

export default keyed

// Picked from
// https://github.com/adamhaile/surplus/blob/master/src/runtime/content.ts#L368

// return an array of the indices of ns that comprise the longest increasing subsequence within ns
function longestPositiveIncreasingSubsequence(ns, newStart) {
  const seq = []
      , is  = []
      , pre = new Array(ns.length)

  let n
    , j
    , i
    , len
    , l = -1

  for (i = newStart, len = ns.length; i < len; i++) {
    n = ns[i]
    if (n >= 0) {
      j = findGreatestIndexLEQ(seq, n)
      if (j !== -1) pre[i] = is[j]
      if (j === l) {
        l++
        seq[l] = n
        is[l] = i
      } else if (n < seq[j + 1]) {
        seq[j + 1] = n
        is[j + 1] = i
      }
    }
  }

  for (i = is[l]; l >= 0; i = pre[i], l--)
    seq[l] = i

  return seq
}

function findGreatestIndexLEQ(seq, n) {
  // invariant: lo is guaranteed to be index of a value <= n, hi to be >
  // therefore, they actually start out of range: (-1, last + 1)
  let lo = -1
    , hi = seq.length
    , mid

  // fast path for simple increasing sequences
  if (hi > 0 && seq[hi - 1] <= n) return hi - 1

  while (hi - lo > 1) {
    mid = Math.floor((lo + hi) / 2)
    seq[mid] > n
      ? hi = mid
      : lo = mid
  }

  return lo
}

function Ref({ key }, { first }) {
  return { dom: first, key }
}
