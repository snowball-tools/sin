function getAfter(node, i) {
  while (node && i--)
    node = node.nextSibling
  return node
}

export function keyed(parent, current, next, create, update, remove, before) { // eslint-disable-line
  let node = before ? before.nextSibling : parent.firstChild
    , tmp
    , mode
    , i = 0
    , after = current.after || getAfter(node, current.length)

  if (next.length === 0) {
    while (i) {
      tmp = node.nextSibling
      remove(node) && i--
      node = tmp
    }
    return
  }

  if (current.length === 0) {
    for (i = 0; i < next.length; i++)
      parent.insertBefore(create(next[i]), node)
    return
  }

  let prevStart = 0
    , newStart = 0
    , loop = true
    , prevEnd = current.length - 1
    , newEnd = next.length - 1
    , a
    , b
    , prevStartNode = before ? before.nextSibling : parent.firstChild
    , newStartNode = prevStartNode
    , prevEndNode = after ? after.previousSibling : parent.lastChild

  fixes: while (loop) {
    loop = false

    // Skip prefix
    a = current[prevStart]
    b = next[newStart]
    while (a.key === b.key) {
      update(prevStartNode, b)
      prevStart++
      newStart++
      newStartNode = prevStartNode = prevStartNode.nextSibling
      if (prevEnd < prevStart || newEnd < newStart) break fixes
      a = current[prevStart]
      b = next[newStart]
    }

    // Skip suffix
    a = current[prevEnd]
    b = next[newEnd]
    while (a.key === b.key) {
      update(prevEndNode, b)
      prevEnd--
      newEnd--
      after = prevEndNode
      prevEndNode = prevEndNode.previousSibling
      if (prevEnd < prevStart || newEnd < newStart) break fixes
      a = current[prevEnd]
      b = next[newEnd]
    }

    // Fast path to swap backward
    a = current[prevEnd]
    b = next[newStart]
    while (a.key === b.key) {
      loop = true
      update(prevEndNode, b)
      node = prevEndNode.previousSibling
      parent.insertBefore(prevEndNode, newStartNode)
      prevEndNode = node
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
      update(prevStartNode, b)
      node = prevStartNode.nextSibling
      parent.insertBefore(prevStartNode, after)
      prevStart++
      after = prevStartNode
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
          remove(prevEndNode) && prevEnd--
        } else {
          tmp = prevEndNode.previousSibling
          remove(prevEndNode) && prevEnd--
          prevEndNode = tmp
        }
      }
    }
    return
  }

  // Fast path for add
  if (prevEnd < prevStart) {
    if (newStart <= newEnd) {
      mode = after ? 1 : 0

      while (newStart <= newEnd) {
        node = create(next[newStart])
        mode ? parent.insertBefore(node, after) : parent.appendChild(node)
        newStart++
      }
    }
    return
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
    if (before !== undefined || after !== undefined) {
      before !== undefined ? before.nextSibling : parent.firstChild

      if (after === undefined) after = null

      while (node !== after) {
        tmp = node.nextSibling
        remove(node) && prevStart++
        node = tmp
      }
    } else {
      parent.textContent = ''
    }

    mode = after ? 1 : 0
    for (i = newStart; i <= newEnd; i++) {
      node = create(next[i])
      mode ? parent.insertBefore(node, after) : parent.appendChild(node)
    }

    return
  }

  // What else?
  const longestSeq = longestPositiveIncreasingSubsequence(P, newStart)

  // Collect nodes to work with them
  const nodes = []
  let tmpC = prevStartNode
  for (i = prevStart; i <= prevEnd; i++) {
    nodes[i] = tmpC
    tmpC = tmpC.nextSibling
  }

  i = 0
  while (i < toRemove.length)
    remove(nodes[toRemove[i]]) && i++

  let lisIdx = longestSeq.length - 1
    , tmpD

  for (i = newEnd; i >= newStart; i--) {
    if (longestSeq[lisIdx] === i) {
      after = nodes[P[longestSeq[lisIdx]]]
      update(after, next[i])
      lisIdx--
    } else {
      if (P[i] === -1) {
        tmpD = create(next[i])
      } else {
        tmpD = nodes[P[i]]
        update(tmpD, next[i])
      }
      parent.insertBefore(tmpD, after)
      after = tmpD
    }
  }
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
