// src/window.js
typeof globalThis === "undefined" && (window.globalThis = window);
var window_default = typeof window === "undefined" ? {} : window;

// src/shared.js
var stackTrace = Symbol("stackTrace");
var resolved = Promise.resolve();
var hasOwn = {}.hasOwnProperty;
function cleanSlash(x2) {
  return x2 && String(x2).replace(/\/+/g, "/").replace(/(.)\/$/, "$1");
}
function cleanHref(x2) {
  return cleanSlash(x2).replace("/?", "?");
}
function notValue(x2) {
  return !x2 && x2 !== 0 && x2 !== "";
}
function snake(x2) {
  return x2.replace(/(\B[A-Z])/g, "-$1").toLowerCase();
}
function isObservable(x2) {
  return x2 && isFunction(x2.observe);
}
function isFunction(x2) {
  return typeof x2 === "function";
}
function isPromise(x2) {
  return x2 && isFunction(x2.then);
}
function isEvent(x2) {
  return x2.charCodeAt(0) === 111 && x2.charCodeAt(1) === 110;
}
function isTagged(x2) {
  return x2 && Array.isArray(x2.raw);
}
function asCssVar(x2) {
  return x2.charCodeAt(0) === 36 ? "--" + x2.slice(1) : x2.charCodeAt(0) === 45 && x2.charCodeAt(1) === 45 ? x2 : null;
}
function ignoredAttr(x2) {
  return x2 === "dom" || x2 === "is" || x2 === "key" || x2 === "handleEvent" || x2 === "type" || x2 === "class" || x2 === "className" || x2 === "style" || x2 === "deferrable" || x2 === "href";
}
function className(view) {
  return (classes(view.attrs.class) + classes(view.attrs.className) + view.tag.classes).trim();
}
function asArray(x2) {
  return Array.isArray(x2) ? x2 : [x2];
}
function noop() {
}
function styleProp(x2) {
  return asCssVar(x2) || (x2 === "cssFloat" ? "float" : snake(x2));
}
function classes(x2) {
  return isObservable(x2) || isFunction(x2) ? classes(x2()) : !x2 ? "" : typeof x2 === "object" ? classObject(x2) : x2 + " ";
}
function classObject(x2) {
  let c = "";
  for (const k in x2)
    c += (c ? " " : "") + (x2[k] || "");
  return c;
}
function scrollSize(w, h) {
  w ? document.documentElement.style.setProperty("min-width", w + "px") : document.documentElement.style.removeProperty("min-width");
  h ? document.documentElement.style.setProperty("min-height", h + "px") : document.documentElement.style.removeProperty("min-height");
}
function scrollRestore(x2, y, w, h) {
  scrollSize(w, h);
  window.scrollTo(x2 || 0, y || 0);
}
function mergeTag(a, b) {
  if (!b || !b.tag)
    return a;
  if (!a || !a.tag)
    return a.tag = b.tag, a;
  a.tag = {
    id: b.tag.id || a.tag.id,
    name: b.tag.name || a.tag.name,
    classes: (a.tag.classes ? a.tag.classes + " " : "") + b.tag.classes,
    args: b.tag.args,
    vars: b.tag.vars,
    parent: a.tag
  };
  return a;
}

// src/view.js
var View = class {
  constructor(inline, component, tag = null, level = 0, attrs = null, children = null) {
    this.level = level;
    this.component = component;
    this.inline = inline;
    this.tag = tag;
    this.attrs = attrs;
    this.key = attrs ? attrs.key : void 0;
    this.dom = null;
    this.children = children;
    this[stackTrace] = hasOwn.call(window_default, stackTrace) ? new Error().stack : null;
  }
};

// src/http.js
["head", "get", "put", "post", "delete", "patch"].forEach(
  (x2) => http[x2] = function(url, object = {}) {
    object.method = x2;
    return http(url, object);
  }
);
http.redraw = () => {
};
var TypedArray = typeof Uint8Array === "undefined" ? [] : [Object.getPrototypeOf(Uint8Array)];
var rich = "Blob ArrayBuffer DataView FormData URLSearchParams File".split(" ").map((x2) => globalThis[x2]).filter((x2) => x2).concat(TypedArray);
function http(url, {
  method = "GET",
  redraw: redraw2 = true,
  responseType,
  json = "application/json",
  query,
  body,
  user,
  pass,
  headers = {},
  config,
  timeout = 0,
  ...options
} = {}) {
  const origin = false;
  const xhr = new window_default.XMLHttpRequest(options);
  let full = false;
  const promise = new Promise((resolve, reject) => {
    let accept, contentType;
    method = method.toUpperCase();
    xhr.addEventListener("readystatechange", function() {
      if (xhr.readyState !== xhr.DONE)
        return;
      try {
        xhr.status && Object.defineProperty(xhr, "body", {
          value: accept === json ? xhr.response === void 0 || xhr.response === "" ? void 0 : JSON.parse(xhr.response) : xhr.response
        });
        xhr.status === 304 || xhr.status >= 200 && xhr.status < 300 ? resolve(full ? xhr : xhr.body) : reject(statusError(xhr));
      } catch (e) {
        reject(e);
      }
    });
    xhr.addEventListener("error", reject);
    xhr.addEventListener("abort", () => reject(new Error("ABORTED")));
    xhr.open(method, appendQuery(url, query), true, user, pass);
    xhr.timeout = timeout;
    responseType && (xhr.responseType = responseType);
    Object.entries(headers).forEach(([x2, v]) => {
      v && xhr.setRequestHeader(x2, v);
      x2.toLowerCase() === "accept" && (accept = v);
      x2.toLowerCase() === "content-type" && (contentType = v);
    });
    !accept && !responseType && json && xhr.setRequestHeader("Accept", accept = json);
    !contentType && body !== void 0 && !rich.some((x2) => body instanceof x2) && json && xhr.setRequestHeader("Content-Type", contentType = json);
    config && config(xhr);
    xhr.send(contentType === json ? JSON.stringify(body) : body);
  }).catch((error) => {
    origin && !origin.message && Object.defineProperty(origin, "message", { value: error.message });
    const x2 = Object.assign(origin || new Error(error.message), {
      ...error,
      url,
      status: xhr.status,
      body: xhr.body || xhr.response
    });
    Object.defineProperty(x2, "xhr", { value: xhr });
    throw x2;
  });
  Object.defineProperty(promise, "xhr", {
    get() {
      full = true;
      return promise;
    }
  });
  return promise;
}
function statusError(xhr) {
  return new Error(
    xhr.status ? xhr.status + (xhr.statusText ? " " + xhr.statusText : "") : "Unknown"
  );
}
function appendQuery(x2, q) {
  const u = new URL(x2, "http://x"), qs = new URLSearchParams(q || "").toString();
  return x2.split(/\?|#/)[0] + u.search + (qs ? (u.search ? "&" : "?") + qs : "") + (u.hash || "");
}

// src/live.js
function event(fn2) {
  const observers = new Set(fn2 ? [fn2] : []);
  event2.observe = (fn3) => (observers.add(fn3), () => observers.delete(fn3));
  return event2;
  function event2(...xs) {
    [...observers].forEach((fn3) => fn3(...xs));
  }
}
function Live(value2, ...fns) {
  const observers = /* @__PURE__ */ new Set();
  fns.forEach((fn2) => isFunction(fn2) && observers.add(fn2));
  live.value = value2;
  live.observe = (fn2) => (observers.add(fn2), () => observers.delete(fn2));
  live.valueOf = live.toString = live.toJSON = () => value2;
  live.detach = noop;
  live.reduce = reduce;
  live.set = (x2) => (...args) => (live(isFunction(x2) ? x2(...args) : x2), live);
  live.get = (x2) => Object.assign(getter.bind(null, x2), { observe: (fn2) => live.observe(() => fn2(getter(x2))) });
  live.if = (...xs) => Object.assign(ternary.bind(null, ...xs), { observe: (fn2) => live.observe((x2) => fn2(ternary(...xs))) });
  return live;
  function getter(x2) {
    return isFunction(x2) ? x2(live.value) : live.value[x2];
  }
  function ternary(equals, a = true, b = false) {
    return live.value === equals ? a : b;
  }
  function live(x2) {
    if (!arguments.length)
      return live.value;
    const prev = value2;
    live.value = value2 = x2;
    observers.forEach((fn2) => live.value !== prev && fn2(live.value, prev));
    return live.value;
  }
  function reduce(fn2, initial) {
    let i2 = 1;
    const result = Live(arguments.length > 1 ? fn2(initial, live.value, i2++) : live.value);
    live.observe((x2) => result(fn2(result.value, x2, i2++)));
    return result;
  }
}
Live.from = function(...xs) {
  const fn2 = xs.pop(), value2 = Live(fn2(...xs.map(call))), unobserve = xs.map((x2) => x2.observe(() => value2(fn2(...xs.map(call)))));
  value2.detach = () => unobserve.forEach(call);
  return value2;
};
function call(fn2) {
  return fn2();
}

// src/router.js
var routing = false;
var routeState = {};
function tokenizePath(x2) {
  return x2.split(/(?=\/)/);
}
function params(path2, xs) {
  return path2.reduce((acc, x2, i2) => {
    x2[1] === ":" && (acc[x2.slice(2)] = decodeURIComponent(xs[i2].slice(1)));
    return acc;
  }, {});
}
function router(s2, root, rootContext, parent) {
  const location2 = route.location = rootContext.location;
  const routed = s2(({ key, route: route2, ...attrs }, [view], context) => {
    context.route = router(s2, key.replace(/\/$/, ""), rootContext, route2);
    route2.key = key;
    return () => resolve(view, attrs, context);
  });
  route.root = parent ? parent.root : route;
  route.parent = parent || route;
  route.query = rootContext.query;
  route.toString = route;
  route.has = (x2) => x2 === "/" ? getPath2(location2) === root || getPath2(location2) === "/" && root === "" : getPath2(location2).indexOf(cleanHref(root + "/" + x2)) === 0;
  Object.defineProperty(route, "path", {
    get() {
      const path2 = getPath2(location2), idx = path2.indexOf("/", root.length + 1);
      return idx === -1 ? path2 : path2.slice(0, idx);
    }
  });
  return route;
  function resolve(view, attrs, context) {
    let result = isFunction(view) ? view(attrs, [], context) : view;
    return isPromise(result) ? s2(() => result)(attrs) : result;
  }
  function getPath2(location3, x2 = 0) {
    return (s2.pathmode[0] === "#" ? location3.hash.slice(s2.pathmode.length + x2) : s2.pathmode[0] === "?" ? location3.search.slice(s2.pathmode.length + x2) : location3.pathname.slice(s2.pathmode + x2)).replace(/(.)\/$/, "$1");
  }
  function reroute(path2, { state, replace: replace2 = false, scroll = true } = {}) {
    if (path2 === getPath2(location2) + location2.search)
      return;
    s2.pathmode[0] === "#" ? window_default.location.hash = s2.pathmode + path2 : s2.pathmode[0] === "?" ? window_default.location.search = s2.pathmode + path2 : window_default.history[replace2 ? "replaceState" : "pushState"](state, null, s2.pathmode + path2);
    routeState[path2] = state;
    path2.indexOf(location2.search) > -1 && rootContext.query(location2.search);
    return s2.redraw().then(() => {
      scroll === false || s2.route.scroll === false ? s2.route.scroll = void 0 : scrollRestore();
    });
  }
  function popstate({ state = {} } = {}) {
    s2.redraw().then(() => scrollRestore(...state.scroll || []));
  }
  function route(routes, options = {}) {
    if (typeof routes === "undefined")
      return root + "/";
    if (typeof routes === "string")
      return reroute(cleanHref(routes[0] === "/" ? routes : "/" + routes), options);
    if (!routing) {
      routing = true;
      s2.pathmode[0] === "#" ? window_default.addEventListener("hashchange", popstate, { passive: true }) : isFunction(window_default.history.pushState) && window_default.addEventListener("popstate", popstate, { passive: true });
    }
    const path2 = getPath2(location2, root.length), pathTokens = tokenizePath(path2), { match, view } = matchRoutes(routes, pathTokens), key = root + (match ? match.map((x2, i2) => x2 === "/*" || x2 === "/?" ? "" : pathTokens[i2]).join("") : "?");
    if (view === void 0 || match[0] === "/?")
      rootContext.doc.status(404);
    route.params = { ...route.parent.params, ...params(match || [], pathTokens) };
    return routed(
      {
        key,
        route,
        ...route.params,
        ...root + path2 === key && routeState[root + path2] || window_default.history.state || {}
      },
      view
    );
  }
}
function matchRoutes(routes, paths) {
  let max = 0;
  let match;
  let view;
  function tryMatch(m, v) {
    m.charCodeAt(0) !== 47 && (m = "/" + m);
    m = tokenizePath(cleanSlash(m));
    if (typeof v === "object" && v != null) {
      for (let key in v)
        tryMatch(m + key, v[key]);
      return;
    }
    const score = getScore(m, paths);
    if (score > max) {
      max = score;
      match = m;
      view = v;
    }
  }
  for (const x2 in routes)
    tryMatch(x2, routes[x2]);
  return { match, view };
}
function getScore(match, path2) {
  return match.reduce(
    (acc, x2, i2) => acc + (x2 === "/?" ? 1 : x2 === path2[i2] ? 7 : x2 && path2[i2] && x2.toLowerCase() === path2[i2].toLowerCase() ? 6 : x2[1] === ":" && path2[i2] && path2[i2].length > 1 ? 5 : x2 === "/" && !path2[i2] ? 4 : x2.indexOf("/...") === 0 ? 3 : x2 === "/*" ? 2 : -Infinity),
    0
  );
}

// src/shorthands.js
var initials = (acc, x2) => (acc[x2.split("-").map((x3) => x3[0]).join("")] = x2, acc);
var popular = [
  "align-items",
  "bottom",
  "background-color",
  "border-radius",
  "box-shadow",
  "background-image",
  "color",
  "display",
  "flex-grow",
  "flex-basis",
  "float",
  "flex-direction",
  "font-family",
  "font-size",
  "font-weight",
  "gap",
  "grid-area",
  "grid-gap",
  "grid-template-area",
  "grid-template-columns",
  "grid-template-rows",
  "height",
  "justify-content",
  "left",
  "line-height",
  "letter-spacing",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "opacity",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "place-items",
  "pointer-events",
  "right",
  "top",
  "text-align",
  "text-decoration",
  "text-transform",
  "text-shadow",
  "user-select",
  "white-space",
  "width",
  "z-index"
];

// src/style.js
var doc = window_default.document;
var style = doc.querySelector("style.sin") || doc.createElement("style");
var vendorRegex = /^(ms|moz|webkit)[-A-Z]/i;
var prefix = style && style.getAttribute("id") || "sin-";
var div = doc.createElement("div");
var aliasCache = {};
var propCache = {};
var unitCache = {};
var alias = (k, v) => typeof v === "string" ? aliasCache["@" + k] = v : Object.entries(k).forEach(([k2, v2]) => alias(k2, v2));
var pxCache = {
  flex: "",
  border: "px",
  "line-height": "",
  "box-shadow": "px",
  "border-top": "px",
  "border-left": "px",
  "border-right": "px",
  "border-bottom": "px",
  "text-shadow": "px",
  "@media": "px"
};
var properties = Array.from(
  Object.keys(hasOwn.call(div.style, "width") ? div.style : Object.getPrototypeOf(div.style)).reduce((acc, x2) => (acc.add(x2.match(vendorRegex) ? "-" + snake(x2) : snake(x2)), acc), /* @__PURE__ */ new Set(["float"]))
);
var shorthands = Object.assign(properties.reduce(initials, {}), popular.reduce(initials, {}));
var vendorMap = properties.reduce((acc, x2) => {
  const vendor2 = x2.match(/-(ms|o|webkit|moz)-/g);
  if (vendor2) {
    const unprefixed = x2.replace(/-(ms|o|webkit|moz)-/, "");
    if (properties.indexOf(unprefixed) === -1) {
      if (unprefixed === "flexDirection")
        acc.flex = "-" + vendor2[1].toLowerCase() + "-flex";
      acc[unprefixed] = x2;
    }
  }
  return acc;
}, {});
var cache = /* @__PURE__ */ new Map();
var hashed = /* @__PURE__ */ new Set();
var cssVars = window_default.CSS && window_default.CSS.supports("color", "var(--support-test)");
var pxFunctions = ["perspective", "blur", "drop-shadow", "inset", "polygon", "minmax"];
var nested = ["@media", "@supports", "@document", "@layer"];
var isNested = (x2) => nested.some((n) => x2.indexOf(n) === 0);
var isPxFunction = (x2) => x2.indexOf("translate") === 0 || pxFunctions.indexOf(x2) > -1;
var isDegFunction = (x2) => x2.indexOf("rotate") === 0 || x2.indexOf("skew") === 0;
var isStartChar = (x2) => x2 !== 32 && x2 !== 9 && x2 !== 10 && x2 !== 13 && x2 !== 59;
var isNumber = (x2) => x2 >= 48 && x2 <= 57 || x2 === 46;
var isLetter = (x2) => x2 >= 65 && x2 <= 90 || x2 >= 97 && x2 <= 122;
var isUnit = (x2) => x2 === 37 || x2 >= 65 && x2 <= 90 || x2 >= 97 && x2 <= 122;
var quoteChar = (x2) => x2 === 34 || x2 === 39;
var propEndChar = (x2) => x2 === 32 || x2 === 58 || x2 === 9;
var valueEndChar = (x2) => x2 === 59 || x2 === 10 || x2 === 125;
var noSpace = (x2) => x2 === 38 || x2 === 58 || x2 === 64 || x2 === 91;
var strict = (x2) => x2 === 59 || x2 === 125;
var last = (xs) => xs[xs.length - 1];
var selectors = [];
var fn = [];
var start = -1;
var valueStart = -1;
var classIdx = -1;
var idIdx = -1;
var startChar = -1;
var quote = -1;
var char = -1;
var lastSpace = -1;
var numberStart = -1;
var fontFaces = -1;
var cssVar = -1;
var temp = "";
var specificity = "";
var prop = "";
var path = "&";
var selector = "";
var animation = "";
var keyframe = "";
var rule = "";
var keyframes = "";
var name = "";
var id = "";
var classes2 = "";
var x = "";
var value = "";
var varName = "";
var rules = null;
var append = true;
var colon = false;
var styles = false;
var cacheable = true;
var hasRules = false;
var hash = 0;
var raw = false;
function shorthand(x2) {
  return shorthands[x2] || x2;
}
function propValue(r, x2, v) {
  return (r ? ";" : "") + (colon ? x2 : renderProp(x2)) + ":" + v;
}
function renderProp(x2) {
  return propCache[x2] || (propCache[x2] = vendor(shorthand(x2)));
}
function splitSelector(x2) {
  return raw ? x2 : x2.replace(/,\s*[:[]?/g, (x3) => noSpace(x3.charCodeAt(x3.length - 1)) ? ",&" + last(x3) : ",& ");
}
function insert(rule2, index) {
  if (append) {
    style && doc.head && doc.head.appendChild(style);
    append = false;
  }
  if (style && style.sheet) {
    try {
      style.sheet.insertRule(
        rule2,
        index != null ? index : style.sheet.cssRules.length
      );
    } catch (e) {
      console.error("Insert rule error:", e, rule2);
    }
  }
}
function parse([xs, ...args], parent, nesting = 0, root = false) {
  if (cache.has(xs)) {
    const prev = cache.get(xs);
    return {
      ...prev,
      parent,
      args
    };
  }
  raw = root;
  const vars = {};
  name = id = classes2 = rule = value = prop = "";
  selectors.length = fn.length = hash = 0;
  lastSpace = valueStart = fontFaces = startChar = cssVar = -1;
  rules = raw ? {} : null;
  hasRules = false;
  styles = false;
  cacheable = true;
  x = xs[0];
  for (let j = 0; j < xs.length; j++) {
    rules ? parseStyles(0, j === xs.length - 1) : parseSelector(xs, j, parent);
    x = xs[j + 1];
    if (j < args.length) {
      const before = xs[j].slice(valueStart);
      let arg = args[j];
      window_default.isServer && isFunction(arg) && !isObservable(arg) && (arg = "6invalidate");
      if (cssVars && valueStart >= 0 && arg !== "6invalidate") {
        temp = prefix + Math.abs(hash).toString(31);
        vars[varName = "--" + temp + j] = { property: prop, unit: getUnit(prop, last(fn)), index: j };
        value += before + "var(" + varName + ")";
        valueStart = 0;
      } else {
        const x2 = before + arg + getUnit(prop, last(fn));
        value += x2;
        for (let i2 = 0; i2 < x2.length; i2++)
          hash = Math.imul(31, hash) + x2.charCodeAt(i2) | 0;
        cacheable = false;
        valueStart = cssVars ? -1 : 0;
      }
    }
  }
  if (hasRules) {
    if (raw) {
      Object.entries(rules).forEach(([k, v]) => {
        insert(k.replace(/&\s+/g, "").replace(/{&$/, "") + "{" + v + "}");
      });
    } else {
      temp = prefix + Math.abs(hash).toString(31);
      classes2 += (classes2 ? " " : "") + temp;
      specificity = "";
      for (let i2 = 0; i2 < nesting; i2++)
        specificity += "." + temp;
      hashed.has(temp) || Object.entries(rules).forEach(
        ([k, v]) => insert(k.replace(/&/g, "." + temp + specificity) + "{" + v + "}")
      );
    }
  }
  const result = {
    name,
    classes: classes2,
    id,
    args,
    vars,
    parent
  };
  cacheable ? cache.set(xs, result) : hashed.add(temp);
  return result;
}
function parseSelector(xs, j, parent) {
  for (let i2 = 0; i2 <= x.length; i2++) {
    char = x.charCodeAt(i2);
    i2 < x.length && (hash = Math.imul(31, hash) + char | 0);
    if (styles) {
      if (isStartChar(char)) {
        rules = {};
        parseStyles(i2++, j === xs.length - 1);
        break;
      }
    } else if (!isStartChar(char) || i2 === x.length) {
      classes2 = (classIdx !== -1 ? x.slice(classIdx + 1, i2).replace(/\./g, " ") : "") + classes2 + (parent ? " " + parent.classes : "");
      id === "" && (id = (idIdx !== -1 ? x.slice(idIdx, classIdx === -1 ? i2 : classIdx) : "") || (parent ? parent.id : null));
      name = x.slice(
        0,
        id ? idIdx - 1 : classIdx !== -1 ? classIdx : i2
      ) || parent && parent.name;
      idIdx = classIdx = -1;
      styles = true;
    } else if (char === 35) {
      idIdx = i2 + 1;
    } else if (classIdx === -1 && char === 46) {
      classIdx = i2;
    }
  }
}
function aliases(x2) {
  return aliasCache[x2] || x2;
}
function parseStyles(idx, end) {
  for (let i2 = idx; i2 <= x.length; i2++) {
    char = x.charCodeAt(i2);
    i2 < x.length && (hash = Math.imul(31, hash) + char | 0);
    if (quote === -1 && valueStart !== -1 && (colon ? strict(char) : valueEndChar(char) || end && i2 === x.length))
      addRule(i2);
    if (quote !== -1) {
      if (quote === char && x.charCodeAt(i2 - 1) !== 92)
        quote = -1;
    } else if (quote === -1 && quoteChar(char)) {
      quote = char;
      if (valueStart === -1)
        valueStart = i2;
    } else if (char === 123) {
      startBlock(i2);
    } else if (char === 125 || end && i2 === x.length) {
      endBlock();
    } else if (i2 !== x.length && start === -1 && isStartChar(char)) {
      start = i2;
      startChar = char;
    } else if (!prop && start >= 0 && propEndChar(char)) {
      prop = x.slice(start, i2);
      colon = char === 58;
    } else if (valueStart === -1 && prop && !propEndChar(char)) {
      valueStart = lastSpace = i2;
      isNumber(char) ? numberStart = i2 : char === 36 && (cssVar = i2);
    } else if (valueStart !== -1) {
      handleValue(i2);
    } else if (char === 9 || char === 32) {
      lastSpace = i2 + 1;
    }
  }
}
function addRule(i2) {
  afterValue(i2);
  prop === "@import" ? insert(prop + " " + x.slice(valueStart, i2) + ";", 0) : rule += propValue(rule, prop, value + x.slice(valueStart, i2));
  hasRules = true;
  start = valueStart = -1;
  colon = false;
  prop = value = "";
}
function afterValue(i2) {
  numberStart !== -1 ? addUnit(i2) : cssVar !== -1 && addCssVar(i2);
}
function startBlock(i2) {
  if (prop === "animation") {
    rule && (rules[path] = rule);
    animation = value + x.slice(valueStart, i2).trim();
    keyframes = value = "";
    rule = "";
  } else if (animation) {
    keyframe = x.slice(start, i2).trim();
    rule = "";
  } else {
    rule && (rules[path] = rule);
    selector = (startChar === 64 ? aliases(prop) + (value || "") + x.slice(valueStart - 1, i2) : x.slice(start, i2)).trim();
    selector.indexOf(",") !== -1 && (selector = splitSelector(selector));
    value = prop = "";
    selectors.push(
      (noSpace(startChar) ? "" : " ") + selector + (selector === "@font-face" && ++fontFaces ? "/*" + Array(fontFaces).join(" ") + "*/" : "")
    );
    path = getPath(selectors);
    rule = rules[path] || "";
  }
  start = valueStart = -1;
  prop = "";
}
function endBlock() {
  if (keyframe) {
    keyframes += keyframe + "{" + rule + "}";
    keyframe = rule = "";
  } else if (animation) {
    rule = rules[path] || "";
    temp = prefix + Math.abs(hash).toString(31);
    insert("@keyframes " + temp + "{" + keyframes + "}");
    rule += propValue(rule, "animation", animation + " " + temp);
    animation = "";
  } else {
    const closing = selectors.map((x2) => x2.charCodeAt(0) === 64 && isNested(x2) ? "}" : "").join("");
    selectors.pop();
    selectors.length && selectors[0].indexOf("@keyframes") === 0 ? rules[selectors[0]] = (rules[selectors[0]] || "") + selector + "{" + rule + "}" : rule && (rules[path] = rule.trim() + closing);
    path = getPath(selectors);
    rule = rules[path] || "";
  }
  start = valueStart = -1;
  prop = "";
}
function handleValue(i2) {
  isNumber(char) ? numberStart === -1 && (numberStart = i2) : afterValue(i2);
  if (char === 40)
    fn.push(x.slice(Math.max(lastSpace, valueStart), i2));
  else if (char === 41)
    fn.pop();
  else if (char === 9 || char === 32)
    lastSpace = i2 + 1;
  else if (char === 36)
    cssVar = i2;
}
function addCssVar(i2) {
  if (!isLetter(char)) {
    value = value + x.slice(valueStart, cssVar) + "var(--" + x.slice(cssVar + 1, i2) + ")";
    valueStart = i2;
    cssVar = -1;
  }
}
function addUnit(i2) {
  if (!isUnit(char) && x.charCodeAt(lastSpace) !== 35) {
    value = value + x.slice(valueStart, i2) + getUnit(prop, last(fn));
    valueStart = i2;
  }
  numberStart = -1;
}
function getUnit(prop2, fn2 = "") {
  prop2 = shorthand(prop2);
  const id2 = prop2 + "," + fn2;
  if (hasOwn.call(unitCache, id2))
    return unitCache[id2];
  return unitCache[id2] = fn2 && isPxFunction(fn2) ? "px" : isDegFunction(fn2) ? "deg" : fn2 ? "" : px(prop2);
}
function formatValue(v, { property, unit }) {
  isFunction(v) && (v = v());
  if (!v && v !== 0)
    return "";
  if (typeof v === "number")
    return v + unit;
  typeof v !== "string" && (v = "" + v);
  if (v.charCodeAt(0) === 36)
    return "var(--" + v.slice(1) + ")";
  x = v;
  value = "";
  valueStart = fn.length = 0;
  numberStart = lastSpace = -1;
  prop = property;
  for (let i2 = 0; i2 <= v.length; i2++) {
    char = v.charCodeAt(i2);
    handleValue(i2);
  }
  return value + v.slice(valueStart);
}
function getPath(selectors2) {
  if (selectors2.length === 0)
    return "&&";
  let n = 0;
  return selectors2.reduce((acc, x2, i2, xs) => {
    const char2 = x2.charCodeAt(0);
    return char2 === 64 && (x2.indexOf("@font-face") === 0 && i2++, isNested(x2)) ? (n++, x2 + "{" + (i2 === xs.length - 1 ? "&&" : "") + acc) : acc + (raw || i2 - n ? "" : char2 === 32 ? "&" : "&&") + x2;
  }, "");
}
function px(x2) {
  x2 = shorthand(x2);
  if (asCssVar(x2) || hasOwn.call(pxCache, x2))
    return pxCache[x2];
  try {
    div.style[x2] = "1px";
    div.style.setProperty(x2, "1px");
    return pxCache[x2] = div.style[x2].slice(-3) === "1px" ? "px" : "";
  } catch (err) {
    return pxCache[x2] = "";
  }
}
function vendor(x2) {
  if (properties.indexOf(x2) === -1) {
    if (vendorMap[x2])
      return vendorMap[x2];
    x2.indexOf("--") !== 0 && window_default.sinHMR && window_default.console.error(x2, "css property not found");
  }
  return x2;
}

// src/query.js
function Query(s2, l) {
  const U = URLSearchParams;
  const modifiers = ["append", "delete", "set", "sort"];
  let last2 = l.search;
  let usp = new U(last2);
  let temp2;
  const query = s2.live();
  query.replace = (x2) => (usp = new U(x2), update2());
  query.clear = () => query.replace("");
  for (const key in U.prototype)
    query[key] = (...xs) => (temp2 = USP()[key](...xs), modifiers.includes(key) && update2(), temp2);
  return query;
  function USP() {
    return last2 === l.search ? usp : (last2 = l.search, usp = new U(last2));
  }
  function update2() {
    const target = l.pathname + (usp + "" ? "?" + (usp + "").replace(/=$/g, "") : "") + l.hash;
    if (location.href.endsWith(target))
      return;
    window_default.history.replaceState(
      window_default.history.state,
      null,
      target
    );
    query(l.search);
    s2.redraw();
  }
}

// src/index.js
var document2 = window_default.document;
var NS = {
  svg: "http://www.w3.org/2000/svg",
  math: "http://www.w3.org/1998/Math/MathML"
};
var removing = /* @__PURE__ */ new WeakSet();
var mounts = /* @__PURE__ */ new Map();
var deferrableSymbol = Symbol("deferrable");
var observableSymbol = Symbol("observable");
var componentSymbol = Symbol("component");
var eventSymbol = Symbol("event");
var arrayEnd = Symbol("arrayEnd");
var arrayStart = Symbol("arrayStart");
var liveSymbol = Symbol("live");
var sizeSymbol = Symbol("size");
var lifeSymbol = Symbol("life");
var attrSymbol = Symbol("attr");
var keyIndexSymbol = Symbol("keyIndex");
var keysSymbol = Symbol("keys");
var keySymbol = Symbol("key");
var sSymbol = Symbol("s");
var afterUpdate = [];
var redrawer;
var redrawed;
function s(...x2) {
  const type = typeof x2[0];
  return type === "string" ? S(Object.assign([x2[0]], { raw: [] }))(...x2.slice(1)) : bind(
    S,
    isTagged(x2[0]) ? tagged(x2) : type === "function" ? new View(s.redrawing, x2) : new View(s.redrawing, [x2[1], x2[0]])
  );
}
function S(...x2) {
  return isTagged(x2[0]) ? bind(S, tagged(x2, this)) : execute(x2, this);
}
function tagged(x2, parent) {
  const level = parent ? parent.level + 1 : 0;
  return new View(
    parent && parent.inline,
    parent && parent.component,
    parse(x2, parent && parent.tag, level),
    level
  );
}
function bind(x2, that) {
  const fn2 = x2.bind(that);
  fn2[sSymbol] = true;
  return fn2;
}
s.redrawing = false;
s.sleep = (x2, ...xs) => new Promise((r) => setTimeout(r, x2, ...xs));
s.with = (x2, fn2) => x2 === void 0 ? x2 : fn2(x2);
s.isAttrs = isAttrs;
s.isServer = false;
s.pathmode = "";
s.redraw = redraw;
s.mount = mount;
s.css = (...x2) => parse(x2, null, 0, true);
s.css.alias = alias;
s.animate = animate;
s.http = http;
s.live = Live;
s.event = event;
s.on = on;
s.trust = trust;
s.route = router(s, "", { location: window_default.location, query: Query(s, window_default.location) });
s.window = window_default;
s.error = s((error) => {
  console.error(error);
  return () => s`pre;all initial;d block;c white;bc #ff0033;p 8 12;br 6;overflow auto;fs 12`(s`code`(
    "Unexpected Error: " + (error.message || error)
  ));
});
var trusted = s(({ strings, values = [] }) => {
  const div2 = document2.createElement("div");
  const raw2 = Array.isArray(strings.raw) ? [...strings.raw] : [strings.trim()];
  raw2[0] = raw2[0].trimStart();
  raw2[raw2.length - 1] = raw2[raw2.length - 1].trimEnd();
  div2.innerHTML = String.raw({ raw: raw2 }, ...values);
  const nodes = [...div2.childNodes, document2.createComment("trust")];
  return () => nodes;
});
function trust(strings, ...values) {
  return trusted({ key: "" + strings, strings, values });
}
function on(target, event2, fn2, options) {
  typeof options === "function" && ([fn2, options] = [options, fn2]);
  return (...xs) => {
    const handleEvent2 = (e) => callHandler(fn2, e, ...xs);
    target.addEventListener(event2, handleEvent2, options);
    return () => target.removeEventListener(event2, handleEvent2, options);
  };
}
function animate(dom) {
  dom.setAttribute("animate", "entry");
  requestAnimationFrame(() => dom.removeAttribute("animate"));
  return (deferrable) => deferrable && new Promise((r) => {
    let running = false;
    dom.addEventListener("transitionrun", () => (running = true, end(r)), { once: true, passive: true });
    dom.setAttribute("animate", "exit");
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => running || r())));
  });
  function end(r) {
    dom.addEventListener("transitionend", r, { once: true, passive: true });
    dom.addEventListener("transitioncancel", r, { once: true, passive: true });
  }
}
function link(dom, route) {
  dom.addEventListener("click", (e) => {
    if (!e.defaultPrevented && (e.button === 0 || e.which === 0 || e.which === 1) && (!e.currentTarget.target || e.currentTarget.target === "_self") && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const state = dom[attrSymbol].state;
      route(dom.getAttribute("href"), { state });
    }
  });
}
function execute(x2, parent) {
  const hasAttrs = isAttrs(x2 && x2[0]);
  return new View(
    parent.inline,
    parent.component,
    parent.tag,
    parent ? parent.level + 1 : 0,
    hasAttrs ? x2.shift() : {},
    x2.length === 1 && Array.isArray(x2[0]) ? x2[0] : x2
  );
}
function isAttrs(x2) {
  return x2 !== null && typeof x2 === "object" && !(x2 instanceof View) && !Array.isArray(x2) && !(x2 instanceof Date) && !(x2 instanceof window_default.Node) && !isFunction(x2.then);
}
function mount(dom, view, attrs = {}, context = {}) {
  if (!isFunction(view)) {
    context = attrs || {};
    attrs = view || {};
    view = dom;
    dom = document2.body;
    if (!dom)
      throw new Error("document.body does not exist.");
  } else if (!dom) {
    throw new Error("The dom element you tried to mount to does not exist.");
  }
  view instanceof View === false && (view = s(view));
  hasOwn.call(context, "location") || (context.location = window_default.location);
  hasOwn.call(context, "error") || (context.error = s.error);
  if (s.isServer)
    return { view, attrs, context };
  scrollRestoration();
  context.hydrating = shouldHydrate(dom.firstChild);
  const doc2 = {
    head: context.hydrating ? noop : head,
    lang: s.live(document2.documentElement.lang, (x2) => document2.documentElement.lang = x2),
    title: s.live(document2.title, (x2) => document2.title = x2),
    status: noop,
    headers: noop
  };
  context.doc = doc2;
  context.route = router(s, "", { doc: context.doc, location: context.location, query: s.route.query });
  mounts.set(dom, { view, attrs, context });
  draw({ view, attrs, context }, dom);
}
function scrollRestoration() {
  window_default.history.scrollRestoration = "manual";
  scrollRestore(...history.state?.scroll || []);
  let scrollTimer;
  document2.addEventListener("scroll", save, { passive: true });
  document2.addEventListener("resize", save, { passive: true });
  function save() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(scrollSave, 100);
  }
}
function scrollSave() {
  window_default.history.replaceState({
    ...history.state,
    scroll: [
      document2.documentElement.scrollLeft || document2.body.scrollLeft,
      document2.documentElement.scrollTop || document2.body.scrollTop,
      document2.documentElement.scrollWidth,
      document2.documentElement.scrollHeight
    ]
  }, null, location.pathname + location.search + location.hash);
}
function head(x2) {
  if (Array.isArray(x2))
    return x2.forEach(head);
  const dom = document2.createElement(x2.tag.name);
  for (const attr in x2.attrs)
    dom.setAttribute(attr, x2.attrs[attr]);
  x2.children.length && (dom.innerHTML = x2.children[0]);
  document2.head.appendChild(dom);
}
function shouldHydrate(dom) {
  const hydrate2 = dom && dom.nodeType === 8 && dom.data === "h" && (dom.remove(), true);
  if (hydrate2) {
    let node;
    const nodes = [];
    const walker = document2.createTreeWalker(document2.body, NodeFilter.SHOW_COMMENT);
    while (node = walker.nextNode())
      node.data === "," && nodes.push(node);
    nodes.forEach((x2) => x2.remove());
  }
  return hydrate2;
}
function redraw() {
  if (!redrawer) {
    window_default.requestAnimationFrame(globalRedraw);
    redrawer = s.isServer ? resolved : new Promise((r) => redrawed = r);
  }
  return redrawer;
}
function globalRedraw() {
  redrawer = null;
  mounts.forEach(draw);
  redrawed();
}
function draw({ view, attrs, context }, dom) {
  s.redrawing = true;
  try {
    updates(dom, asArray(view(attrs)), context);
  } catch (error) {
    attrs.error = error;
    updates(dom, asArray(context.error(error, attrs, [], context)), context);
  }
  s.redrawing = false;
  afterRedraw();
}
function afterRedraw() {
  afterUpdate.forEach((fn2) => fn2());
  afterUpdate = [];
}
function updates(parent, next, context, before, last2 = parent.lastChild) {
  const keys = next[0] && next[0].key !== void 0 && new Array(next.length), ref = getNext(before, parent), tracked = ref && hasOwn.call(ref, keysSymbol), after = last2 ? last2.nextSibling : null;
  keys && (keys.rev = /* @__PURE__ */ new Map()) && tracked ? keyed(parent, context, ref[keysSymbol], next, keys, after, ref) : nonKeyed(parent, context, next, keys, ref, after);
  const first = getNext(before, parent);
  keys && (first[keysSymbol] = keys);
  return Ret(first, after && after.previousSibling || parent.lastChild);
}
function getNext(before, parent) {
  let dom = before ? before.nextSibling : parent.firstChild;
  while (removing.has(dom))
    dom = dom.nextSibling;
  return dom;
}
function Ref(keys, dom, key, i2) {
  keys[i2] = { dom, key };
  dom[keysSymbol] = keys;
  dom[keyIndexSymbol] = i2;
  keys.rev.set(key, i2);
}
function nonKeyed(parent, context, next, keys, dom, after = null) {
  let i2 = 0, temp2, view;
  while (i2 < next.length) {
    if (dom === null || !removing.has(dom)) {
      view = next[i2];
      temp2 = dom !== after ? update(dom, view, context, parent) : update(null, view, context);
      dom === after && parent.insertBefore(temp2.dom, after);
      keys && Ref(keys, temp2.first, view.key, i2);
      dom = temp2.last;
      i2++;
    }
    if (dom !== null)
      dom = dom.nextSibling;
  }
  while (dom && dom !== after)
    dom = remove(dom, parent);
}
function keyed(parent, context, as, bs, keys, after, ref) {
  const map = as.rev, next = /* @__PURE__ */ new Set();
  for (const x2 of bs) {
    if (x2.key === void 0)
      return nonKeyed(parent, context, bs, keys, ref, after);
    next.add(x2.key);
  }
  let ai = as.length - 1, bi = bs.length - 1, a = as[ai], b = bs[bi], temp2 = -1;
  outer:
    while (true) {
      while (a && !next.has(a.key)) {
        remove(a.dom, parent);
        map.delete(a.key);
        a = as[--ai];
      }
      while (a && a.key === b.key) {
        after = update(a.dom, b, context, parent).first;
        Ref(keys, after, b.key, bi);
        map.delete(b.key);
        if (bi === 0)
          break outer;
        if (ai === 0) {
          b = bs[--bi];
          break;
        }
        a = as[--ai];
        b = bs[--bi];
      }
      if (map.has(b.key)) {
        temp2 = map.get(b.key);
        if (temp2 > bi) {
          temp2 = update(as[temp2].dom, b, context, parent);
          insertBefore(parent, temp2, after);
          after = temp2.first;
          Ref(keys, after, b.key, bi);
        } else if (temp2 !== bi) {
          temp2 = update(as[temp2].dom, b, context, parent);
          insertBefore(parent, temp2, after);
          after = temp2.first;
          Ref(keys, after, b.key, bi);
        } else {
          a = as[--ai];
          continue;
        }
        map.delete(b.key);
        if (bi === 0)
          break;
        b = bs[--bi];
      } else {
        temp2 = update(null, b, context);
        insertBefore(parent, temp2, after);
        after = temp2.first;
        Ref(keys, after, b.key, bi);
        if (bi === 0)
          break;
        b = bs[--bi];
      }
    }
  map.forEach((v, k) => remove(as[v].dom, parent));
}
function insertBefore(parent, { first, last: last2 }, before) {
  let temp2 = first, dom;
  do {
    dom = temp2;
    temp2 = dom.nextSibling;
  } while (parent.insertBefore(dom, before) !== last2);
}
function update(dom, view, context, parent, stack, create) {
  return isObservable(view) ? updateLive(dom, view, context, parent, stack, create) : isFunction(view) ? update(dom, view(), context, parent, stack, create) : view instanceof View ? updateView(dom, view, context, parent, stack, create) : view instanceof Promise ? updateView(dom, s(() => view)(), context, parent, stack, create) : Array.isArray(view) ? updateArray(dom, view, context, parent, create) : view instanceof Node ? updateNode(dom, view, context) : updateValue(dom, view, parent, create);
}
function updateNode(dom, view, context) {
  return dom && context.hydrating ? Ret(dom) : Ret(view);
}
function updateView(dom, view, context, parent, stack, create) {
  return view.component ? updateComponent(dom, view, context, parent, stack, create) : updateElement(dom, view, context, parent, create);
}
function updateLive(dom, view, context, parent) {
  if (dom && hasOwn.call(dom, liveSymbol) && dom[liveSymbol].view === view)
    return run(view());
  const result = run(view());
  observe(dom, view, run);
  return result;
  function run(x2) {
    const doms = update(dom, x2, context, parent || dom && dom.parentNode);
    arguments.length > 1 && afterRedraw();
    dom = doms.first;
    doms.first[liveSymbol] = { view, doms };
    return doms;
  }
}
function Ret(dom, first = dom, last2 = first) {
  return { dom, first, last: last2 };
}
function fromComment(dom) {
  if (!dom || dom.nodeType !== 8 || dom.data.charCodeAt(0) !== 91)
    return;
  let l = parseInt(dom.data.slice(1));
  let last2 = dom;
  let char2;
  while (l && last2.nextSibling) {
    last2 = last2.nextSibling;
    if (last2.nodeType === 8) {
      char2 = last2.data.charCodeAt(0);
      l += char2 === 91 ? parseInt(last2.data.slice(1)) - 1 : char2 === 97 ? 1 : -1;
    } else {
      l--;
    }
  }
  markArray(dom, last2);
  return last2;
}
function markArray(first, last2) {
  (last2 || first)[arrayStart] = first;
  first[arrayEnd] = last2;
}
function getArray(dom) {
  return dom && hasOwn.call(dom, arrayEnd) ? dom[arrayEnd] : fromComment(dom);
}
function updateArray(dom, view, context, parent, create) {
  create && dom && parent && (dom = updateArray(dom, [], context, parent).first);
  const last2 = getArray(dom) || dom;
  const comment = updateValue(dom, "[" + view.length, parent, false, 8);
  if (parent) {
    const after = last2 ? last2.nextSibling : null;
    updates(parent, view, context, comment.first, last2);
    const nextLast = after ? after.previousSibling : parent.lastChild;
    last2 !== nextLast && markArray(comment.first, nextLast);
    return Ret(comment.dom, comment.first, nextLast);
  }
  parent = new DocumentFragment();
  parent.appendChild(comment.dom);
  updates(parent, view, context, comment.first, last2);
  markArray(comment.first, parent.lastChild);
  return Ret(parent, comment.first, parent.lastChild);
}
function updateValue(dom, view, parent, create, nodeType = typeof view === "boolean" || view == null ? 8 : 3) {
  const nodeChange = create || !dom || dom.nodeType !== nodeType;
  nodeChange && replace(
    dom,
    dom = nodeType === 8 ? document2.createComment(view) : document2.createTextNode(view),
    parent
  );
  if (!nodeChange && dom.data !== "" + view)
    dom.data = view;
  return Ret(dom);
}
function updateElement(dom, view, context, parent, create = dom === null || tagChanged(dom, view, context)) {
  const previousNS = context.NS;
  view.attrs.xmlns || NS[view.tag.name] && (context.NS = view.attrs.xmlns || NS[view.tag.name]);
  create && replace(
    dom,
    dom = createElement(view, context),
    parent
  );
  const size = view.children && view.children.length;
  attributes(dom, view, context, create);
  size ? updates(dom, view.children, context) : dom[sizeSymbol] && removeChildren(dom.firstChild, dom);
  dom[sizeSymbol] = size;
  context.NS = previousNS;
  hasOwn.call(view, "key") && (dom[keySymbol] = view.key);
  return Ret(dom);
}
function removeChildren(dom, parent) {
  while (dom)
    dom = remove(dom, parent);
}
function tagChanged(dom, view, context) {
  return dom[keySymbol] !== view.key && !context.hydrating || dom.nodeName.toLowerCase() !== (view.tag.name ? view.tag.name.toLowerCase() : "div");
}
function createElement(view, context) {
  const is = view.attrs.is;
  return context.NS ? is ? document2.createElementNS(context.NS, view.tag.name, { is }) : document2.createElementNS(context.NS, view.tag.name) : is ? document2.createElement(view.tag.name || "div", { is }) : document2.createElement(view.tag.name || "div");
}
var Instance = class {
  constructor(init, view, error, loading, hydrating) {
    this.init = init;
    this.key = void 0;
    this.view = view;
    this.error = error;
    this.caught = void 0;
    this.loading = loading;
    this.hydrating = hydrating;
    this.onremoves = void 0;
    this.promise = void 0;
    this.stateful = void 0;
    this.next = void 0;
    this.ignore = false;
    this.context = void 0;
    this.recreate = false;
  }
};
var Stack = class {
  constructor() {
    this.xs = [];
    this.i = 0;
    this.top = 0;
    this.dom = null;
  }
  changed(view, context) {
    if (this.i >= this.xs.length)
      return true;
    const instance = this.xs[this.i];
    const x2 = instance.key !== view.key && !context.hydrating || instance.init && instance.init !== view.component[0];
    x2 && instance.onremoves && instance.onremoves.forEach((x3) => x3());
    return x2;
  }
  add(view, context, optimistic) {
    const [init, options] = view.component;
    const instance = new Instance(
      view.inline ? false : init,
      init,
      options && options.error || context.error,
      options && options.loading || context.loading,
      context.hydrating
    );
    const update2 = (e, recreate, optimistic2) => {
      e instanceof Event && (e.redraw = false);
      const keys = this.dom.first[keysSymbol];
      updateComponent(this.dom.first, view, context, this.dom.first.parentNode, this, recreate, optimistic2, true);
      hasOwn.call(this.dom.first, keysSymbol) || (this.dom.first[keysSymbol] = keys);
      keys && keys.rev.has(view.key) && (keys[keys.rev.get(view.key)].dom = this.dom.first);
      afterRedraw();
    };
    const redraw2 = (e) => {
      update2(e, false, true, true);
    };
    const reload = (e) => {
      instance.onremoves && (instance.onremoves.forEach((x2) => x2()), instance.onremoves = void 0);
      update2(e, true);
    };
    const refresh = (e) => {
      instance.onremoves && (instance.onremoves.forEach((x2) => x2()), instance.onremoves = void 0);
      update2(e, true, true);
    };
    instance.context = Object.create(context, {
      hydrating: { value: context.hydrating, writable: true },
      onremove: { value: (fn2) => {
        onremoves(instance, fn2);
      } },
      ignore: { value: (x2) => {
        instance.ignore = x2;
      } },
      refresh: { value: refresh },
      redraw: { value: redraw2 },
      reload: { value: reload }
    });
    const next = catchInstance(true, instance, view);
    isObservable(view.attrs.reload) && onremoves(instance, view.attrs.reload.observe(reload));
    isObservable(view.attrs.redraw) && onremoves(instance, view.attrs.redraw.observe(redraw2));
    isObservable(view.attrs.refresh) && onremoves(instance, view.attrs.refresh.observe(refresh));
    instance.promise = next && isFunction(next.then) && next;
    instance.stateful = instance.promise || isFunction(next) && !next[sSymbol];
    instance.view = optimistic ? this.xs[this.i].view : instance.promise ? instance.loading : next;
    this.xs.length = this.top = this.i;
    return this.xs[this.i++] = instance;
  }
  next() {
    return this.i < this.xs.length && this.xs[this.top = this.i++];
  }
  pop() {
    return --this.i === 0 && !(this.xs.length = this.top + 1, this.top = 0);
  }
};
function onremoves(instance, x2) {
  instance.onremoves ? instance.onremoves.add(x2) : instance.onremoves = /* @__PURE__ */ new Set([x2]);
}
function hydrate(dom) {
  const id2 = "/" + dom.data;
  let last2 = dom.nextSibling;
  while (last2 && (last2.nodeType !== 8 || last2.data !== id2))
    last2 = last2.nextSibling;
  const x2 = Ret(dom.nextSibling, dom.nextSibling, last2.previousSibling);
  hasOwn.call(last2, arrayStart) && markArray(last2[arrayStart], last2.previousSibling);
  hasOwn.call(dom, componentSymbol) && (x2.first[componentSymbol] = dom[componentSymbol]);
  if (hasOwn.call(dom, keysSymbol)) {
    const keys = dom[keysSymbol];
    x2.first[keysSymbol] = keys;
    keys[dom[keyIndexSymbol]].dom = x2.first;
  }
  dom.remove();
  last2.remove();
  return x2;
}
function bounds(dom) {
  const id2 = "/" + dom.data;
  let last2 = dom.nextSibling;
  while (last2 && (last2.nodeType !== 8 || last2.data !== id2))
    last2 = last2.nextSibling;
  return Ret(dom, dom, last2);
}
function updateComponent(dom, component, context, parent, stack = dom && dom[componentSymbol] || new Stack(), create = stack.changed(component, context), optimistic = false, local = false) {
  const instance = create ? stack.add(component, context, optimistic) : stack.next();
  if (!create && instance.ignore && !local) {
    stack.pop();
    return stack.dom;
  }
  component.key !== void 0 && (create || context.hydrating) && (instance.key = component.key);
  const hydratingAsync = instance.promise && dom && dom.nodeType === 8 && dom.data.charCodeAt(0) === 97;
  if (hydratingAsync) {
    instance.next = bounds(dom);
  } else {
    let view = catchInstance(create, instance, component);
    view && hasOwn.call(view, sSymbol) && (view = view(component.attrs, component.children, instance.context));
    instance.next = update(
      dom,
      !instance.caught && !instance.promise && view instanceof View ? mergeTag(view, component) : view,
      instance.context,
      parent,
      stack,
      (create || instance.recreate) && !instance.hydrating ? true : void 0
    );
    instance.hydrating && (instance.hydrating = instance.context.hydrating = false);
    instance.recreate && (instance.recreate = false);
  }
  let i2 = stack.i - 1;
  create && instance.promise && instance.promise.then((view) => instance.view = view && hasOwn.call(view, "default") ? view.default : view).catch((error) => {
    instance.caught = error;
    instance.view = resolveError(instance, component, error);
  }).then(() => hasOwn.call(instance.next.first, componentSymbol) && stack.xs[i2] === instance && (hydratingAsync && (stack.dom = hydrate(dom)), context.hydrating = false, instance.recreate = true, instance.promise = false, instance.ignore ? instance.context.redraw() : redraw()));
  const changed = dom !== instance.next.first;
  if (stack.pop() && (changed || create)) {
    stack.dom = instance.next;
    instance.next.first[componentSymbol] = stack;
  }
  return instance.next;
}
function catchInstance(create, instance, view) {
  try {
    return instance.stateful || create ? isFunction(instance.view) && !instance.view[sSymbol] ? instance.view(view.attrs, view.children, instance.context) : instance.view : view.component[0](view.attrs, view.children, instance.context);
  } catch (error) {
    return resolveError(instance, view, error);
  }
}
function resolveError(instance, view, error) {
  return hasOwn.call(instance.error, sSymbol) ? instance.error().component[0](error, view.attrs, view.children, instance.context) : instance.error(error, view.attrs, view.children, instance.context);
}
function attributes(dom, view, context) {
  let tag = view.tag, value2;
  const prev = dom[attrSymbol] || context.hydrating && getAttributes(dom), create = !prev;
  hasOwn.call(view.attrs, "id") === false && tag.id && (view.attrs.id = tag.id);
  if (create && tag.classes || view.attrs.class !== (prev && prev.class) || view.attrs.className !== (prev && prev.className) || dom.className !== tag.classes)
    setClass(dom, view);
  create && observe(dom, view.attrs.class, () => setClass(dom, view));
  create && observe(dom, view.attrs.className, () => setClass(dom, view));
  view.attrs.type != null && setAttribute(dom, "type", view.attrs.type);
  for (const attr in view.attrs) {
    if (ignoredAttr(attr)) {
      if (attr === "deferrable") {
        dom[deferrableSymbol] = view.attrs[attr];
      }
    } else if (attr === "value" && tag.name === "input" && dom.value !== "" + view.attrs.value) {
      value2 = view.attrs[attr];
      let start2, end;
      if (dom === document2.activeElement) {
        start2 = dom.selectionStart;
        end = dom.selectionEnd;
      }
      updateAttribute(dom, view.attrs, attr, dom.value, value2, create);
      if (dom === document2.activeElement && (dom.selectionStart !== start2 || dom.selectionEnd !== end))
        dom.setSelectionRange(start2, end);
      if (!view.attrs.oninput)
        console.log("oninput handler required when value is specified for", dom);
    } else if (!prev || prev[attr] !== view.attrs[attr]) {
      value2 = view.attrs[attr];
      updateAttribute(dom, view.attrs, attr, prev && prev[attr], value2, create);
    }
  }
  if (hasOwn.call(view.attrs, "href") && (context.hydrating || !prev || prev.href !== view.attrs.href)) {
    value2 = view.attrs.href;
    const internal = !String(value2).match(/^[a-z]+:|\/\//);
    internal && (value2 = cleanSlash(view.attrs.href));
    updateAttribute(dom, view.attrs, "href", prev && prev.href, value2, create);
    if (value2 && internal) {
      view.attrs.href = s.pathmode + value2;
      link(dom, context.route);
    }
  }
  if (prev) {
    for (const attr in prev) {
      if (hasOwn.call(view.attrs, attr) === false) {
        isEvent(attr) ? removeEvent(dom, attr) : ignoredAttr(attr) ? attr === "deferrable" && (dom[deferrableSymbol] = false) : dom.removeAttribute(attr);
      }
    }
  }
  const reapply = updateStyle(dom, view.attrs.style, prev && prev.style);
  if (tag) {
    setVars(dom, tag.vars, tag.args, create || context.hydrating, reapply);
    while (tag = tag.parent)
      setVars(dom, tag.vars, tag.args, create || context.hydrating, reapply);
  }
  if ((create || context.hydrating) && view.attrs.dom)
    giveLife(dom, view.attrs, view.children, context, view.attrs.dom);
  hasOwn.call(view, stackTrace) && (dom[stackTrace] = view[stackTrace]);
  dom[attrSymbol] = view.attrs;
}
function getAttributes(dom) {
  if (!dom || !dom.hasAttributes())
    return;
  const attrs = {};
  for (const attr of dom.attributes) {
    attrs[attr.name] = attr.value || true;
  }
  return attrs;
}
function updateStyle(dom, style2, old) {
  if (old === style2)
    return;
  if (style2 == null)
    return dom.style.cssText = "", true;
  if (typeof style2 !== "object")
    return dom.style.cssText = style2, true;
  if (old == null || typeof old !== "object") {
    dom.style.cssText = "";
    for (const x2 in style2) {
      const value2 = style2[x2];
      value2 != null && dom.style.setProperty(styleProp(x2), value2 + "");
    }
    return true;
  }
  for (const x2 in style2) {
    let value2 = style2[x2];
    if (value2 != null && (value2 = value2 + "") !== old[x2] + "")
      dom.style.setProperty(styleProp(x2), value2);
  }
  for (const x2 in old) {
    if (old[x2] != null && style2[x2] == null)
      dom.style.removeProperty(styleProp(x2));
  }
  return true;
}
function observe(dom, x2, fn2) {
  if (!isObservable(x2))
    return;
  const has = hasOwn.call(dom, observableSymbol);
  const xs = has ? dom[observableSymbol] : /* @__PURE__ */ new Set();
  has || (dom[observableSymbol] = xs);
  xs.add(x2.observe(fn2));
}
function setClass(dom, view) {
  const x2 = className(view);
  x2 ? dom instanceof SVGElement ? dom.setAttribute("class", x2) : dom.className = x2 : dom.removeAttribute("class");
}
function setVars(dom, vars, args, init, reapply) {
  for (const id2 in vars) {
    const cssVar2 = vars[id2];
    const value2 = args[cssVar2.index];
    setVar(dom, id2, value2, cssVar2, init, reapply);
  }
}
function setVar(dom, id2, value2, cssVar2, init, reapply, after) {
  if (isObservable(value2)) {
    init && value2.observe((x2) => dom.style.setProperty(id2, formatValue(x2, cssVar2)));
    if (init || reapply)
      setVar(dom, id2, value2(), cssVar2, init, init);
    return;
  }
  if (isFunction(value2))
    return resolved.then(() => setVar(dom, id2, value2(dom), cssVar2, init, reapply, after));
  dom.style.setProperty(id2, formatValue(value2, cssVar2));
  after && afterUpdate.push(() => dom.style.setProperty(id2, formatValue(value2, cssVar2)));
}
function giveLife(dom, attrs, children, context, life) {
  afterUpdate.push(() => {
    asArray(life).forEach(async (l) => {
      let x2 = isFunction(l) && l(dom, attrs, children, context);
      x2 && isFunction(x2.then) && (x2 = await x2, redraw());
      isFunction(x2) && (hasOwn.call(dom, lifeSymbol) ? dom[lifeSymbol].push(x2) : dom[lifeSymbol] = [x2]);
    }, []);
  });
}
function updateAttribute(dom, attrs, attr, old, value2, create) {
  if (old === value2)
    return;
  const on2 = isEvent(attr);
  if (on2 && typeof old === typeof value2)
    return;
  on2 ? value2 ? addEvent(dom, attrs, attr) : removeEvent(dom, attr) : (setAttribute(dom, attr, value2), create && observe(dom, value2, (x2) => setAttribute(dom, attr, x2)));
}
function setAttribute(dom, attr, value2) {
  if (isFunction(value2))
    return setAttribute(dom, attr, value2());
  dom instanceof SVGElement === false && attr in dom ? dom[attr] = value2 === void 0 ? null : value2 : notValue(value2) ? dom.removeAttribute(attr) : dom.setAttribute(attr, value2 === true ? "" : value2);
}
function removeEvent(dom, name2) {
  dom.removeEventListener(name2.slice(2), dom[eventSymbol]);
}
function addEvent(dom, attrs, name2) {
  dom.addEventListener(
    name2.slice(2),
    dom[eventSymbol] || (dom[eventSymbol] = handleEvent(dom))
  );
}
function handleEvent(dom) {
  return {
    handleEvent: (e) => callHandler(dom[attrSymbol]["on" + e.type], e, dom)
  };
}
function callHandler(handler, e, ...xs) {
  if (Array.isArray(handler))
    return handler.forEach((x2) => callHandler(x2, e, ...xs));
  const result = isFunction(handler) ? handler.call(e.currentTarget, e, ...xs) : isFunction(handler.handleEvent) && handler.handleEvent(e, ...xs);
  if (e.redraw === false)
    return;
  !isObservable(result) && !isObservable(handler) && redraw();
  result && isFunction(result.then) && result.then(redraw);
}
function replace(old, dom, parent) {
  if (!parent)
    return;
  if (old) {
    parent.insertBefore(dom, old);
    remove(old, parent);
  }
  return dom;
}
function removeArray(dom, parent, root, promises, deferrable) {
  const last2 = getArray(dom);
  if (!last2)
    return dom.nextSibling;
  if (dom === last2)
    return dom.nextSibling;
  const after = last2.nextSibling;
  dom = dom.nextSibling;
  if (!dom)
    return after;
  do
    dom = remove(dom, parent, root, promises, deferrable);
  while (dom && dom !== after);
  return after;
}
function removeChild(parent, dom) {
  const x2 = hasOwn.call(dom, componentSymbol) && dom[componentSymbol];
  x2 && x2.i <= x2.top && (x2.i ? x2.xs.slice(i) : x2.xs).forEach((x3) => x3.onremoves && x3.onremoves.forEach((x4) => x4()));
  hasOwn.call(dom, observableSymbol) && dom[observableSymbol].forEach((x3) => x3());
  parent.removeChild(dom);
}
function remove(dom, parent, root = true, promises = [], deferrable = false) {
  let after = dom.nextSibling;
  if (removing.has(dom))
    return after;
  if (dom.nodeType === 8) {
    if (dom.data.charCodeAt(0) === 97) {
      after = dom.nextSibling;
      removeChild(parent, dom);
      if (!after)
        return after;
      dom = after;
      after = dom.nextSibling;
    } else if (dom.data.charCodeAt(0) === 91) {
      after = removeArray(dom, parent, root, promises, deferrable);
    }
  }
  if (dom.nodeType !== 1) {
    root && removeChild(parent, dom);
    return after;
  }
  if (hasOwn.call(dom, lifeSymbol)) {
    for (const life of dom[lifeSymbol]) {
      try {
        const promise = life(deferrable || root);
        if (deferrable || root)
          promise && isFunction(promise.then) && promises.push(promise);
      } catch (error) {
        console.error(error);
      }
    }
  }
  !deferrable && (deferrable = dom[deferrableSymbol] || false);
  let child = dom.firstChild;
  while (child) {
    remove(child, dom, false, promises, deferrable);
    child = child.nextSibling;
  }
  root && (promises.length === 0 ? removeChild(parent, dom) : (removing.add(dom), Promise.allSettled(promises).then(() => removeChild(parent, dom))));
  return after;
}
export {
  s as default
};
