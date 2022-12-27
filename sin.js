// src/shared.js
var isServer = typeof window === "undefined" || typeof window.document === "undefined";
var stackTrace = Symbol("stackTrace");
var hasOwn = {}.hasOwnProperty;
function cleanSlash(x2) {
  return String(x2).replace(/\/+/g, "/").replace(/(.)\/$/, "$1");
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
  return isObservable(x2) ? classes(x2.value) : isFunction(x2) ? classes(x2()) : !x2 ? "" : typeof x2 === "object" ? classObject(x2) : x2 + " ";
}
function classObject(x2) {
  let c = "";
  for (const k in x2)
    c += (c ? " " : "") + (x2[k] || "");
  return c;
}

// src/window.js
typeof globalThis === "undefined" && (window.globalThis = window);
var window_default = isServer ? {} : window;

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
    this.stack = hasOwn.call(window_default, stackTrace) ? new Error().stack : null;
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
  timeout = 0
} = {}) {
  const origin = false;
  const xhr = new window_default.XMLHttpRequest();
  let full = false;
  const promise = new Promise((resolve2, reject) => {
    let accept, contentType;
    method = method.toUpperCase();
    xhr.addEventListener("readystatechange", function() {
      if (xhr.readyState !== xhr.DONE)
        return;
      try {
        xhr.status && Object.defineProperty(xhr, "body", {
          value: accept === json ? JSON.parse(xhr.response) : xhr.response
        });
        xhr.status === 304 || xhr.status >= 200 && xhr.status < 300 ? resolve2(full ? xhr : xhr.body) : reject(statusError(xhr));
      } catch (e) {
        reject(e);
      }
      redraw2 && http.redraw && http.redraw();
    });
    xhr.addEventListener("error", reject);
    xhr.addEventListener("abort", () => reject(new Error("ABORTED")));
    xhr.open(method, appendQuery(url, query), true, user, pass);
    xhr.timeout = timeout;
    responseType && (xhr.responseType = responseType);
    Object.entries(headers).forEach(([x2, v]) => {
      xhr.setRequestHeader(x2, v);
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
function signal() {
  const observers = /* @__PURE__ */ new Set();
  signal2.observe = (fn2) => (observers.add(fn2), () => observers.delete(fn2));
  return signal2;
  function signal2(...xs) {
    [...observers].forEach((fn2) => fn2(...xs));
  }
}
function Live(value2, ...fn2) {
  const observers = /* @__PURE__ */ new Set();
  isFunction(fn2) && observers.add(fn2);
  live.value = value2;
  live.observe = (fn3) => (observers.add(fn3), () => observers.delete(fn3));
  live.valueOf = live.toString = live.toJSON = () => value2;
  live.detach = noop;
  live.reduce = reduce;
  live.set = (x2) => (...args) => (live(isFunction(x2) ? x2(...args) : x2), live);
  live.get = (x2) => Object.assign(getter.bind(null, x2), { observe: (fn3) => live.observe(() => fn3(getter(x2))) });
  live.if = (...xs) => Object.assign(ternary.bind(null, ...xs), { observe: (fn3) => live.observe((x2) => fn3(ternary(...xs))) });
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
    live.value = x2;
    [...observers].forEach((fn3) => live.value !== value2 && fn3(live.value, value2));
    value2 = live.value;
    return live.value;
  }
  function reduce(fn3, initial) {
    let i = 1;
    const result = Live(arguments.length > 1 ? fn3(initial, live.value, i++) : live.value);
    live.observe((x2) => result(fn3(result.value, x2, i++)));
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

// src/query.js
function Query(s2, l) {
  const U = URLSearchParams;
  const modifiers = ["append", "delete", "set", "sort"];
  let last2 = l.search;
  let usp = new U(last2);
  let temp2;
  const query = { replace: (x2) => (usp = new U(x2), update2()), clear: () => query.replace("") };
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
    window_default.history.pushState(
      window_default.history.state,
      null,
      target
    );
    s2.redraw();
  }
}

// src/router.js
var routing = false;
var routeState = {};
function tokenizePath(x2) {
  return x2.split(/(?=\/)/);
}
function getScore(match, path2) {
  return match.reduce(
    (acc, x2, i) => acc + (x2 === "/?" ? 1 : x2 === path2[i] ? 6 : x2 && path2[i] && x2.toLowerCase() === path2[i].toLowerCase() ? 5 : x2[1] === ":" && path2[i] && path2[i].length > 1 ? 4 : x2 === "/" && !path2[i] ? 3 : x2 === "*" || x2 === "/*" ? 2 : -Infinity),
    0
  );
}
function params(path2, xs) {
  return path2.reduce((acc, x2, i) => {
    x2[1] === ":" && (acc[x2.slice(2)] = decodeURIComponent(xs[i].slice(1)));
    return acc;
  }, {});
}
function resolve(view, attrs, context) {
  return isFunction(view) ? view(attrs, [], context) : view;
}
function router(s2, root, rootContext) {
  const location2 = rootContext.location;
  const routed = s2(({ route: route2, ...attrs }, [view], context) => {
    context.route = route2;
    return () => typeof view === "string" ? import((view[0] === "/" ? "" : route2) + view).then((x2) => resolve(x2.default, attrs, context)) : resolve(view, attrs, context);
  });
  route.query = Query(s2, rootContext.location);
  route.toString = route;
  route.has = (x2) => x2 === "/" ? getPath2(location2) === root || getPath2(location2) === "/" && root === "" : getPath2(location2).indexOf(cleanSlash(root + "/" + x2)) === 0;
  Object.defineProperty(route, "path", {
    get() {
      const path2 = getPath2(location2), idx = path2.indexOf("/", root.length + 1);
      return idx === -1 ? path2 : path2.slice(0, idx);
    }
  });
  return route;
  function getPath2(location3, x2 = 0) {
    return (s2.pathmode[0] === "#" ? location3.hash.slice(s2.pathmode.length + x2) : s2.pathmode[0] === "?" ? location3.search.slice(s2.pathmode.length + x2) : location3.pathname.slice(s2.pathmode + x2)).replace(/(.)\/$/, "$1");
  }
  function reroute(path2, { state, replace: replace2 = false, scroll = rootChange(path2) } = {}) {
    if (path2 === getPath2(location2))
      return;
    s2.pathmode[0] === "#" ? window_default.location.hash = s2.pathmode + path2 : s2.pathmode[0] === "?" ? window_default.location.search = s2.pathmode + path2 : window_default.history[replace2 ? "replaceState" : "pushState"](state, null, s2.pathmode + path2);
    routeState[path2] = state;
    s2.redraw();
    scroll && scrollTo(0, 0);
  }
  function rootChange(path2) {
    return path2.split("/")[1] !== route.path.split("/")[1];
  }
  function route(routes, options = {}) {
    if (typeof routes === "undefined")
      return root + "/";
    if (typeof routes === "string")
      return reroute(cleanSlash(routes[0] === "/" ? routes : "/" + routes), options);
    if (!routing) {
      routing = true;
      s2.pathmode[0] === "#" ? window_default.addEventListener("hashchange", s2.redraw, { passive: true }) : isFunction(window_default.history.pushState) && window_default.addEventListener("popstate", s2.redraw, { passive: true });
    }
    const path2 = getPath2(location2, root.length);
    const pathTokens = tokenizePath(path2);
    const [, match, view] = Object.entries(routes).reduce((acc, [match2, view2]) => {
      match2.charCodeAt(0) === 47 || (match2 = "/" + match2);
      match2 = tokenizePath(cleanSlash(match2));
      const score = getScore(match2, pathTokens);
      return score > acc[0] ? [score, match2, view2] : acc;
    }, [0]);
    const current = root + (match && match[0] !== "/*" ? match.map((x2, i) => pathTokens[i]).join("") : "");
    if (view === void 0 || match[0] === "/?")
      rootContext.doc.status(404);
    const subRoute = router(s2, current.replace(/\/$/, ""), rootContext);
    subRoute.parent = route;
    subRoute.root = route.parent ? route.parent.root : route;
    return routed(
      {
        key: current || "?",
        route: subRoute,
        ...root + path2 === current && routeState[root + path2] || {},
        ...params(match || [], pathTokens)
      },
      view
    );
  }
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
var mediasCache = {};
var propCache = {};
var unitCache = {};
var medias = (x2) => Object.entries(x2).forEach(([k, v]) => mediasCache["@" + k] = v);
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
var cssVars = isServer || typeof window_default !== "undefined" && window_default.CSS && CSS.supports("color", "var(--support-test)");
var pxFunctions = ["perspective", "blur", "drop-shadow", "inset", "polygon"];
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
  return x2.replace(/,\s*[:[]?/g, (x3) => noSpace(x3.charCodeAt(x3.length - 1)) ? ",&" + last(x3) : ",& ");
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
    rules ? parseStyles(0, j === xs.length - 1) : parseSelector(xs, j, args, parent);
    x = xs[j + 1];
    if (j < args.length) {
      if (cssVars && valueStart >= 0) {
        const before = xs[j].slice(valueStart);
        temp = prefix + Math.abs(hash).toString(31);
        vars[varName = "--" + temp + j] = { property: prop, unit: getUnit(prop, last(fn)), index: j };
        value += before + "var(" + varName + ")";
        valueStart = 0;
      } else {
        args[j] && (x = args[j] + x);
        cacheable = false;
        valueStart = -1;
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
      for (let i = 0; i < nesting; i++)
        specificity += "." + temp;
      hashed.has(temp) || Object.entries(rules).forEach(([k, v]) => {
        insert(
          k.replace(/&/g, "." + temp + specificity) + "{" + v + "}"
        );
      });
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
function parseSelector(xs, j, args, parent) {
  for (let i = 0; i <= x.length; i++) {
    char = x.charCodeAt(i);
    i < x.length && (hash = Math.imul(31, hash) + char | 0);
    if (styles) {
      if (isStartChar(char)) {
        rules = {};
        parseStyles(i++, j === xs.length - 1);
        break;
      }
    } else if (!isStartChar(char) || i === x.length) {
      classes2 = (classIdx !== -1 ? x.slice(classIdx + 1, i).replace(/\./g, " ") : "") + classes2 + (parent ? " " + parent.classes : "");
      id === "" && (id = (idIdx !== -1 ? x.slice(idIdx, classIdx === -1 ? i : classIdx) : "") || (parent ? parent.id : null));
      name = x.slice(
        0,
        id ? idIdx - 1 : classIdx !== -1 ? classIdx : i
      ) || parent && parent.name;
      idIdx = classIdx = -1;
      styles = true;
    } else if (char === 35) {
      idIdx = i + 1;
    } else if (classIdx === -1 && char === 46) {
      classIdx = i;
    }
  }
}
function atHelper(x2) {
  return mediasCache[x2] || x2;
}
function parseStyles(idx, end) {
  for (let i = idx; i <= x.length; i++) {
    char = x.charCodeAt(i);
    i < x.length && (hash = Math.imul(31, hash) + char | 0);
    if (quote === -1 && valueStart !== -1 && (colon ? strict(char) : valueEndChar(char) || end && i === x.length))
      addRule(i);
    if (quote !== -1) {
      if (quote === char && x.charCodeAt(i - 1) !== 92)
        quote = -1;
    } else if (quote === -1 && quoteChar(char)) {
      quote = char;
      if (valueStart === -1)
        valueStart = i;
    } else if (char === 123) {
      startBlock(i);
    } else if (char === 125 || end && i === x.length) {
      endBlock();
    } else if (i !== x.length && start === -1 && isStartChar(char)) {
      start = i;
      startChar = char;
    } else if (!prop && start >= 0 && propEndChar(char)) {
      prop = x.slice(start, i);
      colon = char === 58;
    } else if (valueStart === -1 && prop && !propEndChar(char)) {
      valueStart = i;
      isNumber(char) ? numberStart = i : char === 36 && (cssVar = i);
    } else if (valueStart !== -1) {
      handleValue(i);
    } else if (char === 9 || char === 32) {
      lastSpace = i + 1;
    }
  }
}
function addRule(i) {
  numberStart > -1 && !isUnit(char) ? addUnit(i) : cssVar > -1 && addCssVar(i);
  prop === "@import" ? insert(prop + " " + x.slice(valueStart, i) + ";", 0) : rule += propValue(rule, prop, value + x.slice(valueStart, i));
  hasRules = true;
  start = valueStart = -1;
  colon = false;
  prop = value = "";
}
function startBlock(i) {
  if (prop === "animation") {
    rule && (rules[path] = rule);
    animation = value + x.slice(valueStart, i).trim();
    keyframes = value = "";
    rule = "";
  } else if (animation) {
    keyframe = x.slice(start, i).trim();
    rule = "";
  } else {
    rule && (rules[path] = rule);
    selector = (startChar === 64 ? atHelper(prop) + (value || "") + x.slice(valueStart - 1, i) : x.slice(start, i)).trim();
    selector.indexOf(",") !== -1 && (selector = splitSelector(selector));
    value = prop = "";
    selectors.push(
      (noSpace(startChar) ? "" : " ") + (selector === "@font-face" ? Array(++fontFaces + 1).join(" ") : "") + selector
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
    selectors.pop();
    selectors.length && selectors[0].indexOf("@keyframes") === 0 ? rules[selectors[0]] = (rules[selectors[0]] || "") + selector + "{" + rule + "}" : rule && (rules[path] = rule.trim() + selectors.map((x2) => x2.charCodeAt(0) === 64 ? "}" : "").join(""));
    path = getPath(selectors);
    rule = rules[path] || "";
  }
  start = valueStart = -1;
  prop = "";
}
function handleValue(i) {
  if (isNumber(char))
    numberStart === -1 && (numberStart = i);
  else if (numberStart > -1)
    addUnit(i);
  else if (cssVar > -1)
    addCssVar(i);
  if (char === 40)
    fn.push(x.slice(Math.max(lastSpace, valueStart), i));
  else if (char === 41)
    fn.pop();
  else if (char === 9 || char === 32)
    lastSpace = i + 1;
  else if (char === 36)
    cssVar = i;
}
function addCssVar(i) {
  if (!isLetter(char)) {
    value = value + x.slice(valueStart, cssVar) + "var(--" + x.slice(cssVar + 1, i) + ")";
    valueStart = i;
    cssVar = -1;
  }
}
function addUnit(i) {
  if (!isUnit(char) && x.charCodeAt(lastSpace) !== 35) {
    value = value + x.slice(valueStart, i) + getUnit(prop, last(fn));
    valueStart = i;
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
  if (!v && v !== 0)
    return "";
  isFunction(v) && (v = isServer ? "" : v());
  if (typeof v === "number")
    return v + unit;
  typeof v !== "string" && (v = "" + v);
  if (v.charCodeAt(0) === 36)
    return "var(--" + v.slice(1) + ")";
  x = v;
  value = "";
  valueStart = 0;
  numberStart = lastSpace = -1;
  fn.length = 0;
  prop = property;
  for (let i = 0; i <= v.length; i++) {
    char = v.charCodeAt(i);
    handleValue(i);
  }
  return value + v.slice(valueStart);
}
function getPath(selectors2) {
  if (selectors2.length === 0)
    return "&&";
  return selectors2.reduce((acc, x2, i, xs) => {
    const char2 = x2.charCodeAt(0);
    return char2 === 64 && isNested(x2) ? x2 + "{" + (i === xs.length - 1 ? "&&" : "") + acc : acc + (raw ? "" : char2 === 32 ? "&" : "&&") + x2;
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
    x2.indexOf("--") !== 0 && console.error(x2, "css property not found");
  }
  return x2;
}

// src/index.js
var document = window_default.document;
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
var arraySymbol = Symbol("array");
var liveSymbol = Symbol("live");
var sizeSymbol = Symbol("size");
var lifeSymbol = Symbol("life");
var attrSymbol = Symbol("attr");
var keysSymbol = Symbol("keys");
var keySymbol = Symbol("key");
var sSymbol = Symbol("s");
var idle = true;
var afterUpdate = [];
var redrawing = false;
function s(...x2) {
  const type = typeof x2[0];
  return type === "string" ? S(Object.assign([x2[0]], { raw: [] }))(...x2.slice(1)) : bind(
    S,
    isTagged(x2[0]) ? tagged(x2) : type === "function" ? new View(redrawing, x2) : new View(redrawing, [x2[1], x2[0]])
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
s.sleep = (x2, ...xs) => new Promise((r) => setTimeout(r, x2, ...xs));
s.with = (x2, fn2) => fn2(x2);
s.isServer = isServer;
s.pathmode = "";
s.redraw = redraw;
s.mount = mount;
s.css = (...x2) => parse(x2, null, 0, true);
s.animate = animate;
s.http = http;
s.http.redraw = !s.isServer && redraw;
s.medias = medias;
s.live = Live;
s.signal = signal;
s.on = on;
s.trust = trust;
s.route = router(s, "", { location: window_default.location });
s.window = window_default;
s.error = s((error) => {
  console.error(error);
  return () => s`pre;all initial;d block;c white;bc #ff0033;p 8 12;br 6;overflow auto;fs 12`(s`code`(
    "Unexpected Error: " + (error.message || error)
  ));
});
function trust(strings, ...values) {
  return s(() => {
    const div2 = document.createElement("div");
    div2.innerHTML = String.raw({ raw: strings }, ...values);
    const nodes = [...div2.childNodes];
    return () => nodes;
  });
}
function on(target, event, fn2, options) {
  return () => {
    const handleEvent2 = (e) => callHandler(fn2, e);
    target.addEventListener(event, handleEvent2, options);
    return () => target.removeEventListener(event, handleEvent2, options);
  };
}
function animate(dom) {
  dom.setAttribute("animate", "entry");
  requestAnimationFrame(() => dom.removeAttribute("animate"));
  return (deferrable) => deferrable && new Promise((r) => {
    let running = false;
    dom.setAttribute("animate", "exit");
    dom.addEventListener("transitionrun", () => (running = true, end(r)), { once: true, passive: true });
    raf3(
      () => running ? end(r) : r()
    );
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
  return x2 && typeof x2 === "object" && !(x2 instanceof Date) && !Array.isArray(x2) && !(x2 instanceof View) && !(x2 instanceof window_default.Node);
}
function mount(dom, view, attrs = {}, context = {}) {
  if (!isFunction(view)) {
    context = attrs || {};
    attrs = view || {};
    view = dom;
    dom = document.body;
  }
  view instanceof View === false && (view = s(view));
  hasOwn.call(context, "location") || (context.location = window_default.location);
  hasOwn.call(context, "error") || (context.error = s.error);
  if (isServer)
    return { view, attrs, context };
  context.hydrating = shouldHydrate(dom.firstChild);
  const doc2 = {
    head: context.hydrating ? noop : head,
    lang: s.live(document.documentElement.lang, (x2) => document.documentElement.lang = x2),
    title: s.live(document.title, (x2) => document.title = x2),
    status: noop,
    headers: noop
  };
  context.doc = doc2;
  Object.assign(context, doc2);
  context.route = router(s, "", context);
  mounts.set(dom, { view, attrs, context });
  draw({ view, attrs, context }, dom);
}
function head(x2) {
  if (Array.isArray(x2))
    return x2.forEach(head);
  const dom = document.createElement(x2.tag.name);
  for (const attr in x2.attrs)
    dom.setAttribute(attr, x2.attrs[attr]);
  x2.children.length && (dom.innerHTML = dom.children[0]);
  document.head.appendChild(dom);
}
function shouldHydrate(dom) {
  return dom && dom.nodeType === 8 && dom.nodeValue === "h" && (dom.remove(), true);
}
function redraw() {
  idle && (requestAnimationFrame(globalRedraw), idle = false);
}
function globalRedraw() {
  mounts.forEach(draw);
  idle = true;
}
function draw({ view, attrs, context }, dom) {
  redrawing = true;
  try {
    const x2 = view(attrs, [], context);
    updates(dom, asArray(x2), context);
  } catch (error) {
    attrs.error = error;
    updates(dom, asArray(context.error(error, attrs, [], context)), context);
  }
  redrawing = false;
  afterUpdate.forEach((fn2) => fn2());
  afterUpdate = [];
}
function updates(parent, next, context, before, last2 = parent.lastChild) {
  const keys = next[0] && next[0].key !== void 0 && new Array(next.length), ref = getNext(before, parent), tracked = ref && hasOwn.call(ref, keysSymbol), after = last2 ? last2.nextSibling : null;
  keys && (keys.rev = {}) && tracked ? keyed(parent, context, ref[keysSymbol], next, keys, after, ref) : nonKeyed(parent, context, next, keys, ref, after);
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
function Ref(keys, dom, key, i) {
  keys[i] = { dom, key };
  keys.rev[key] = i;
}
function nonKeyed(parent, context, next, keys, dom, after = null) {
  let i = 0, temp2, view;
  while (i < next.length) {
    if (dom === null || !removing.has(dom)) {
      view = next[i];
      temp2 = dom !== after ? update(dom, view, context, parent) : update(null, view, context);
      dom === after && parent.insertBefore(temp2.dom, after);
      keys && Ref(keys, temp2.first, view.key, i);
      dom = temp2.last;
      i++;
    }
    if (dom !== null) {
      dom = dom.nextSibling;
      dom !== null && dom.nodeType === 8 && dom.nodeValue === "," && (dom = remove(dom, parent));
    }
  }
  while (dom && dom !== after)
    dom = remove(dom, parent);
}
function keyed(parent, context, as, bs, keys, after, ref) {
  const map = as.rev;
  let ai = as.length - 1, bi = bs.length - 1, a = as[ai], b = bs[bi], temp2 = -1;
  outer:
    while (true) {
      while (a.key === b.key) {
        if (a.key === void 0 || b.key === void 0)
          return nonKeyed(parent, context, bs, keys, ref, after);
        after = updateView(a.dom, b, context, parent).first;
        Ref(keys, after, b.key, bi);
        delete map[b.key];
        if (bi === 0)
          break outer;
        if (ai === 0) {
          b = bs[--bi];
          break;
        }
        a = as[--ai];
        b = bs[--bi];
      }
      if (a.key === void 0 || b.key === void 0)
        return nonKeyed(parent, context, bs, keys, ref, after);
      if (hasOwn.call(map, b.key)) {
        temp2 = map[b.key];
        if (temp2 > bi) {
          temp2 = updateView(as[temp2].dom, b, context, parent);
          insertBefore(parent, temp2, after);
          after = temp2.first;
          Ref(keys, after, b.key, bi);
        } else if (temp2 !== bi) {
          temp2 = updateView(as[temp2].dom, b, context, parent);
          insertBefore(parent, temp2, after);
          after = temp2.first;
          Ref(keys, after, b.key, bi);
        } else {
          a = as[--ai];
          continue;
        }
        delete map[b.key];
        if (bi === 0)
          break;
        b = bs[--bi];
      } else {
        temp2 = updateView(null, b, context);
        insertBefore(parent, temp2, after);
        after = temp2.first;
        Ref(keys, after, b.key, bi);
        if (bi === 0)
          break;
        b = bs[--bi];
      }
    }
  for (const k in map)
    remove(as[map[k]].dom, parent);
}
function insertBefore(parent, { first, last: last2 }, before) {
  let temp2 = first, dom;
  do {
    dom = temp2;
    temp2 = dom.nextSibling;
  } while (parent.insertBefore(dom, before) !== last2);
}
function update(dom, view, context, parent, stack, create) {
  return isObservable(view) ? updateLive(dom, view, context, parent, stack, create) : isFunction(view) ? update(dom, view(), context, parent, stack, create) : view instanceof View ? updateView(dom, view, context, parent, stack, create) : view instanceof Promise ? updateView(dom, s(() => view)(), context, parent, stack, create) : Array.isArray(view) ? updateArray(dom, view, context, parent, create) : view instanceof Node ? Ret(view) : updateValue(dom, view, parent, create);
}
function updateView(dom, view, context, parent, stack, create) {
  return view.component ? updateComponent(dom, view, context, parent, stack, create) : updateElement(dom, view, context, parent, create);
}
function updateLive(dom, view, context, parent) {
  if (dom && hasOwn.call(dom, liveSymbol) && dom[liveSymbol] === view)
    return dom[liveSymbol];
  let result;
  run(view.value);
  view.observe(run);
  return result;
  function run(x2) {
    result = update(dom, x2, context, parent || dom && dom.parentNode);
    result.first[liveSymbol] = result;
    dom = result.first;
  }
}
function Ret(dom, first = dom, last2 = first) {
  return { dom, first, last: last2 };
}
function nthAfter(dom, n) {
  while (dom && --n > 0)
    dom = dom.nextSibling;
  return dom;
}
function fromComment(dom) {
  if (!dom)
    return;
  const last2 = dom.nodeType === 8 && dom.nodeValue.charCodeAt(0) === 91 && nthAfter(dom.nextSibling, parseInt(dom.nodeValue.slice(1)));
  last2 && (dom[arraySymbol] = last2);
  return last2;
}
function getArray(dom) {
  return dom && hasOwn.call(dom, arraySymbol) ? dom[arraySymbol] : fromComment(dom);
}
function updateArray(dom, view, context, parent, create) {
  create && dom && parent && (dom = updateArray(dom, [], context, parent).first);
  const last2 = getArray(dom) || dom;
  const comment = updateValue(dom, "[" + view.length, parent, dom === last2, 8);
  if (parent) {
    const after = last2 ? last2.nextSibling : null;
    updates(parent, view, context, comment.first, last2);
    const nextLast = after ? after.previousSibling : parent.lastChild;
    last2 !== nextLast && (comment.first[arraySymbol] = nextLast);
    return Ret(comment.dom, comment.first, nextLast);
  }
  parent = new DocumentFragment();
  parent.appendChild(comment.dom);
  updates(parent, view, context, comment.first, last2);
  comment.first[arraySymbol] = parent.lastChild;
  return Ret(parent, comment.first, parent.lastChild);
}
function updateValue(dom, view, parent, create, nodeType = typeof view === "boolean" || view == null ? 8 : 3) {
  const nodeChange = create || !dom || dom.nodeType !== nodeType;
  nodeChange && replace(
    dom,
    dom = nodeType === 8 ? document.createComment(view) : document.createTextNode(view),
    parent
  );
  if (!nodeChange && dom.nodeValue !== "" + view)
    dom.nodeValue = view;
  return Ret(dom);
}
function updateElement(dom, view, context, parent, create = dom === null || tagChanged(dom, view)) {
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
function tagChanged(dom, view) {
  return dom[keySymbol] !== view.key || dom.nodeName.toUpperCase() !== (view.tag.name || "div").toUpperCase();
}
function createElement(view, context) {
  const is = view.attrs.is;
  return context.NS ? is ? document.createElementNS(context.NS, view.tag.name, { is }) : document.createElementNS(context.NS, view.tag.name) : is ? document.createElement(view.tag.name || "DIV", { is }) : document.createElement(view.tag.name || "DIV");
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
  }
};
var Stack = class {
  constructor() {
    this.life = [];
    this.xs = [];
    this.i = 0;
    this.top = 0;
  }
  changed(view) {
    if (this.i >= this.xs.length)
      return true;
    const instance = this.xs[this.i];
    const x2 = instance.key !== view.key || instance.init && instance.init !== view.component[0];
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
    const redraw2 = (e) => {
      e instanceof Event && (e.redraw = false);
      updateComponent(this.dom.first, view, context, this.dom.first.parentNode, this, false);
    };
    const reload = (e) => {
      instance.onremoves && (instance.onremoves.forEach((x2) => x2()), instance.onremoves = void 0);
      e instanceof Event && (e.redraw = false);
      updateComponent(this.dom.first, view, context, this.dom.first.parentNode, this, true);
    };
    const refresh = (e) => {
      instance.onremoves && (instance.onremoves.forEach((x2) => x2()), instance.onremoves = void 0);
      e instanceof Event && (e.redraw = false);
      updateComponent(this.dom.first, view, context, this.dom.first.parentNode, this, true, true);
    };
    instance.context = Object.create(context, {
      onremove: { value: (fn2) => {
        onremoves(this, instance, fn2);
      } },
      ignore: { value: (x2) => {
        instance.ignore = x2;
      } },
      refresh: { value: refresh },
      redraw: { value: redraw2 },
      reload: { value: reload }
    });
    const next = catchInstance(true, instance, view);
    isObservable(view.attrs.reload) && onremoves(this, instance, view.attrs.reload.observe(reload));
    isObservable(view.attrs.redraw) && onremoves(this, instance, view.attrs.redraw.observe(redraw2));
    isObservable(view.attrs.refresh) && onremoves(this, instance, view.attrs.refresh.observe(refresh));
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
function onremoves(stack, instance, x2) {
  instance.onremoves ? stack.life.push(() => () => instance.onremoves.forEach((x3) => x3())) : instance.onremoves = /* @__PURE__ */ new Set();
  instance.onremoves.add(x2);
}
function hydrate(dom) {
  let last2 = dom.nextSibling;
  while (last2 && (last2.nodeType !== 8 || last2.nodeValue !== dom.nodeValue))
    last2 = last2.nextSibling;
  return Ret(dom, dom, last2);
}
function dehydrate(x2, stack) {
  x2.first.nextSibling[componentSymbol] = stack;
  x2.first.remove();
  x2.last && x2.last.remove();
}
function updateComponent(dom, component, context, parent, stack = dom && dom[componentSymbol] || new Stack(), create = stack.changed(component), optimistic = false) {
  const instance = create ? stack.add(component, context, optimistic) : stack.next();
  if (!create && instance.ignore) {
    stack.pop();
    return stack.dom;
  }
  component.key && create && (instance.key = component.key);
  const hydratingAsync = instance.promise && dom && dom.nodeType === 8 && dom.nodeValue.charCodeAt(0) === 97;
  if (hydratingAsync) {
    instance.next = hydrate(dom);
  } else {
    let view = catchInstance(create, instance, component);
    view && hasOwn.call(view, sSymbol) && (view = view());
    instance.next = update(
      dom,
      !instance.caught && !instance.promise && view instanceof View ? mergeTag(view, component) : view,
      instance.context,
      parent,
      stack,
      (create || instance.recreate) && !instance.hydrating ? true : void 0
    );
    instance.hydrating && (instance.hydrating = context.hydrating = false);
    instance.recreate && (instance.recreate = false);
  }
  create && instance.promise && instance.promise.then((view) => instance.view = view && hasOwn.call(view, "default") ? view.default : view).catch((error) => {
    instance.caught = error;
    instance.view = resolveError(instance, component, error);
  }).then(() => hasOwn.call(instance.next.first, componentSymbol) && (hydratingAsync && dehydrate(instance.next, stack), instance.recreate = true, instance.promise = false, redraw()));
  const changed = dom !== instance.next.first;
  if (stack.pop() && (changed || create)) {
    stack.dom = instance.next;
    instance.next.first[componentSymbol] = stack;
    !instance.promise && giveLife(instance.next.first, component.attrs, component.children, instance.context, stack.life);
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
function attributes(dom, view, context) {
  let tag = view.tag, value2;
  const prev = dom[attrSymbol], create = !prev;
  hasOwn.call(view.attrs, "id") === false && view.tag.id && (view.attrs.id = view.tag.id);
  if (create && view.tag.classes || view.attrs.class !== (prev && prev.class) || view.attrs.className !== (prev && prev.className) || dom.className !== view.tag.classes)
    setClass(dom, view, context);
  create && observe(dom, view.attrs.class, () => setClass(dom, view, context));
  create && observe(dom, view.attrs.className, () => setClass(dom, view, context));
  view.attrs.type != null && setAttribute(dom, "type", view.attrs.type, context);
  for (const attr in view.attrs) {
    if (ignoredAttr(attr)) {
      attr === "deferrable" && (dom[deferrableSymbol] = view.attrs[attr]);
    } else if (!prev || prev[attr] !== view.attrs[attr]) {
      value2 = view.attrs[attr];
      updateAttribute(dom, context, view.attrs, attr, prev && prev[attr], value2, create);
    }
  }
  if (hasOwn.call(view.attrs, "href")) {
    value2 = view.attrs.href;
    updateAttribute(dom, context, view.attrs, "href", prev && prev.href, value2, create);
    if (value2 && !String(value2).match(/^[a-z]+:|\/\//)) {
      view.attrs.href = s.pathmode + cleanSlash(value2);
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
  if (view.tag) {
    setVars(dom, view.tag.vars, view.tag.args, create, reapply);
    while (tag = tag.parent)
      setVars(dom, tag.vars, tag.args, create, reapply);
  }
  create && view.attrs.dom && giveLife(dom, view.attrs, view.children, context, view.attrs.dom);
  create && view.stack && (dom[stackTrace] = view.stack);
  dom[attrSymbol] = view.attrs;
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
function setClass(dom, view, context) {
  const x2 = className(view);
  x2 ? context.NS ? dom.setAttribute("class", x2) : dom.className = x2 : dom.removeAttribute("class");
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
      setVar(dom, id2, value2.value, cssVar2, init, init);
    return;
  }
  if (isFunction(value2)) {
    requestAnimationFrame(() => setVar(dom, id2, value2(dom), cssVar2, init, reapply, after));
    return;
  }
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
function updateAttribute(dom, context, attrs, attr, old, value2, create) {
  if (old === value2)
    return;
  const on2 = isEvent(attr);
  if (on2 && typeof old === typeof value2)
    return;
  on2 ? value2 ? addEvent(dom, attrs, attr) : removeEvent(dom, attr) : (setAttribute(dom, attr, value2, context), create && observe(dom, value2, (x2) => setAttribute(dom, attr, x2, context)));
}
function setAttribute(dom, attr, value2, context) {
  if (isFunction(value2))
    return setAttribute(dom, attr, value2(), context);
  !context.NS && attr in dom ? dom[attr] = value2 : notValue(value2) ? dom.removeAttribute(attr) : dom.setAttribute(attr, value2 === true ? "" : value2);
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
    handleEvent: (e) => callHandler(dom[attrSymbol]["on" + e.type], e)
  };
}
function callHandler(handler, e) {
  const result = isFunction(handler) ? handler.call(e.currentTarget, e) : isFunction(handler.handleEvent) && handler.handleEvent(e);
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
  hasOwn.call(dom, observableSymbol) && dom[observableSymbol].forEach((x2) => x2());
  parent.removeChild(dom);
}
function remove(dom, parent, root = true, promises = [], deferrable = false) {
  let after = dom.nextSibling;
  if (removing.has(dom))
    return after;
  if (dom.nodeType === 8) {
    if (dom.nodeValue.charCodeAt(0) === 97) {
      after = dom.nextSibling;
      removeChild(parent, dom);
      if (!after)
        return after;
      dom = after;
      after = dom.nextSibling;
    } else if (dom.nodeValue.charCodeAt(0) === 91) {
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
function raf3(fn2) {
  requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(fn2)));
}
export {
  s as default
};
