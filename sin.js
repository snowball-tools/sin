// src/window.js
var window_default = typeof window !== "undefined" ? window : proxy();
function proxy() {
  return {
    location: {},
    document: {
      documentElement: {
        style: {}
      },
      querySelector: () => null,
      createElement: (x2) => {
        const dom = {
          tagName: x2.toUpperCase(),
          setAttribute: (x3, v) => dom.x = v,
          getAttribute: (x3) => dom[x3],
          style: {
            setProperty: () => true
          }
        };
        x2 === "style" && Object.assign(dom, {
          sheet: {
            insertRule: (rule2, index) => index ? dom.sheet.cssRules.splice(index, 0, fixCurlies(rule2)) : dom.sheet.cssRules.push(fixCurlies(rule2)),
            cssRules: []
          }
        });
        return dom;
      }
    }
  };
}
function fixCurlies(x2) {
  return x2 + x2.match(/\{/g).map(() => "}").join("");
}

// src/view.js
var View = class {
  constructor(component, tag = null, level = 0, attrs2 = {}, children = null) {
    this.level = level;
    this.component = component;
    this.tag = tag;
    this.attrs = attrs2;
    this.key = "key" in attrs2 ? attrs2.key : null;
    this.dom = null;
    this.children = children;
  }
};

// src/http.js
["get", "put", "post", "delete", "patch"].forEach((x2) => http[x2] = function(url, object = {}) {
  object.method = x2;
  return http(url, object);
});
http.redraw = () => {
};
function http(url, {
  method = "GET",
  redraw: redraw2 = true,
  body = null,
  user = void 0,
  pass = void 0,
  headers = {},
  config = () => {
  },
  raw = false,
  background = false,
  extract = (xhr) => JSON.parse(xhr.responseText)
} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        let body2 = xhr.responseText, error;
        if (!raw) {
          try {
            body2 = extract(xhr);
          } catch (e) {
            error = e;
          }
        }
        (error || xhr.status >= 300 ? reject : resolve)({
          status: xhr.status,
          body: body2,
          xhr
        });
        redraw2 && !background && http.redraw();
      }
    };
    xhr.onerror = xhr.onabort = (event) => reject({ event, xhr });
    xhr.open(method.toUpperCase(), url, true, user, pass);
    Object.keys(headers).forEach((x2) => headers[x2] && xhr.setRequestHeader(x2, headers[x2]));
    "Content-Type" in headers === false && xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    "Accept" in headers === false && xhr.setRequestHeader("Accept", "application/json, text/*");
    config(xhr);
    body === null ? xhr.send() : xhr.send(raw ? body : JSON.stringify(body));
  });
}

// src/live.js
function Live(value2, fn2) {
  const observers = new Set();
  typeof fn2 === "function" && observers.add(fn2);
  live.observe = (fn3) => (observers.add(fn3), () => observers.delete(fn3));
  live.valueOf = live.toString = live.toJSON = () => value2;
  live.constructor = Live;
  live.detach = () => {
  };
  live.reduce = reduce;
  live.bind = (x2) => (e) => (e && (e.redraw = false), live(typeof x2 === "function" ? x2() : x2 || e));
  live.if = (equals, a = true, b = false) => Live.from(live, (x2) => x2 === equals ? a : b);
  live.to = (prop2) => Live.from(live, (x2) => typeof prop2 === "function" ? prop2(x2) : x2[prop2]);
  return Object.defineProperty(live, "value", {
    get: () => value2,
    set
  });
  function live(x2) {
    arguments.length && set(x2);
    return value2;
  }
  function set(x2) {
    if (x2 === value2)
      return;
    value2 = x2;
    observers.forEach((fn3) => fn3(x2));
  }
  function reduce(fn3, initial) {
    let i = 1;
    const result = Live(arguments.length > 1 ? fn3(initial, value2, i++) : value2);
    live.observe((x2) => result.value = fn3(result.value, x2, i++));
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
  "float",
  "flex-direction",
  "font-family",
  "font-size",
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
  "right",
  "top",
  "text-align",
  "text-decoration",
  "text-transform",
  "width"
];

// src/style.js
var doc = window_default.document;
var style = doc && doc.querySelector && (doc.querySelector(".sin-styles") || doc.createElement("style"));
var vendorRegex = /^(o|O|ms|MS|Ms|moz|Moz|webkit|Webkit|WebKit)([A-Z])/;
var snake = (x2) => x2.replace(/(\B[A-Z])/g, "-$1").toLowerCase();
var prefix = style && style.getAttribute("id") || "sin-";
var div = doc.createElement("div");
var mediasCache = {};
var propCache = {};
var unitCache = {};
var medias = (x2) => Object.entries(x2).forEach(([k, v]) => mediasCache["@" + k] = v);
var pxCache = {
  flex: "",
  border: "px",
  transform: "px",
  "line-height": "",
  "box-shadow": "px",
  "border-top": "px",
  "border-left": "px",
  "border-right": "px",
  "border-bottom": "px",
  "@media": "px"
};
var properties = ["float"].concat(Object.keys(div.style.hasOwnProperty("width") ? div.style : Object.getPrototypeOf(div.style))).reduce((acc, x2) => (x2.indexOf("-") === -1 && acc.push(x2.match(vendorRegex) ? "-" + snake(x2) : snake(x2)), acc), []).sort();
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
var cache = new Map();
var cssVars = typeof window_default !== "undefined" && window_default.CSS && CSS.supports("color", "var(--support-test)");
var isStartChar = (x2) => x2 !== 32 && x2 !== 9 && x2 !== 10 && x2 !== 13 && x2 !== 59;
var isNumber = (x2) => x2 >= 48 && x2 <= 57 || x2 === 46;
var isUnit = (x2) => x2 === 37 || x2 >= 65 && x2 <= 90 || x2 >= 97 && x2 <= 122;
var quoteChar = (x2) => x2 === 34 || x2 === 39;
var propEndChar = (x2) => x2 === 32 || x2 === 58 || x2 === 9;
var valueEndChar = (x2) => x2 === 59 || x2 === 10 || x2 === 125;
var noSpace = (x2) => x2 === 58 || x2 === 64 || x2 === 38 || x2 === 91;
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
var ts = "";
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
var classes = "";
var x = "";
var value = "";
var varName = "";
var rules = null;
var append = true;
var colon = false;
var styles = false;
var cacheable = true;
var hasRules = false;
var fontFaces = -1;
var hash = 0;
function shorthand(x2) {
  return shorthands[x2] || x2;
}
function propValue(x2, v) {
  return (colon ? x2 : renderProp(x2)) + ":" + v + ";";
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
      style.sheet.insertRule(rule2, index != null ? index : style.sheet.cssRules.length);
    } catch (e) {
      console.error("Insert rule error:", e, rule2);
    }
  }
}
function parse([xs, ...args], parent, nesting = 0, root) {
  if (cache.has(xs)) {
    const prev = cache.get(xs);
    return {
      ...prev,
      args
    };
  }
  const vars = {};
  name = id = classes = rule = value = "";
  selectors.length = hash = 0;
  valueStart = fontFaces = -1;
  rules = root ? {} : null;
  hasRules = false;
  styles = false;
  cacheable = true;
  x = xs[0];
  for (let j = 0; j < xs.length; j++) {
    rules ? parseStyles(0, j === xs.length - 1) : parseSelector(xs, j, args, parent);
    x = xs[j + 1];
    if (j < args.length) {
      if (valueStart >= 0) {
        const before = xs[j].slice(valueStart);
        ts = prefix + Math.abs(hash).toString(31);
        vars[varName = "--" + ts + j] = { unit: getUnit(prop, last(fn)), index: j };
        value += before + "var(" + varName + ")";
        valueStart = 0;
      } else if (args[j]) {
        x += args[j] + ";";
        cacheable = false;
      }
    }
  }
  if (hasRules) {
    if (root) {
      Object.entries(rules).forEach(([k, v]) => insert(k.replace(/&\s*/g, "") + "{" + v));
    } else {
      ts = prefix + Math.abs(hash).toString(31);
      classes += (classes ? " " : "") + ts;
      specificity = "";
      for (let i = 0; i < nesting; i++)
        specificity += "." + ts;
      Object.entries(rules).forEach(([k, v]) => {
        insert(k.replace(/&/g, "." + ts + specificity) + "{" + v);
      });
    }
  }
  const result = {
    name,
    classes,
    id,
    args,
    vars,
    parent
  };
  cacheable && cache.set(xs, result);
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
      classes = (classIdx !== -1 ? x.slice(classIdx + 1, i).replace(/\./g, " ") : "") + classes + (parent ? parent.classes : "");
      id === "" && (id = (idIdx !== -1 ? x.slice(idIdx, classIdx === -1 ? i : classIdx) : "") || (parent ? parent.id : null));
      name = x.slice(0, id ? idIdx - 1 : classIdx !== -1 ? classIdx : i) || parent && parent.name;
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
    if (quote === -1 && valueStart >= 0 && (colon ? char === 59 : valueEndChar(char) || end && i === x.length)) {
      numberStart > -1 && !isUnit(char) && addUnit(i);
      prop === "@import" ? insert(prop + " " + x.slice(valueStart, i), 0) : rule += propValue(prop, value + x.slice(valueStart, i));
      hasRules = true;
      start = valueStart = -1;
      colon = false;
      prop = value = "";
    }
    if (quote !== -1) {
      if (quote === char && x.charCodeAt(i - 1) !== 92)
        quote = -1;
    } else if (quote === -1 && quoteChar(char)) {
      quote = char;
      if (valueStart === -1)
        valueStart = i;
    } else if (char === 123) {
      if (prop === "animation") {
        rule && (rules[path || "&"] = rule);
        animation = value + x.slice(valueStart, i).trim();
        keyframes = value = "";
        rule = "";
      } else if (animation) {
        keyframe = x.slice(start, i).trim();
        rule = "";
      } else {
        rule && (rules[path || "&"] = rule);
        selector = startChar === 64 ? atHelper(prop + value + x.slice(valueStart, i).trim()) : x.slice(start, i).trim();
        selector.indexOf(",") !== -1 && (selector = splitSelector(selector));
        value = prop = "";
        selectors.push((noSpace(startChar) ? "" : " ") + (selector === "@font-face" ? Array(++fontFaces + 1).join(" ") : "") + selector);
        path = selectors.toString();
        rule = rules[path || "&"] || "";
      }
      start = valueStart = -1;
      prop = "";
    } else if (char === 125 || end && i === x.length) {
      if (keyframe) {
        keyframes += keyframe + "{" + rule + "}";
        keyframe = rule = "";
      } else if (animation) {
        ts = prefix + Math.abs(hash).toString(31);
        insert("@keyframes " + ts + "{" + keyframes + "}");
        rule = (rules[path || "&"] || "") + propValue("animation", animation + " " + ts);
        animation = "";
      } else {
        rule && (rules[path || "&"] = rule);
        selectors.pop();
        path = selectors.toString();
        rule = rules[path || "&"] || "";
      }
      start = valueStart = -1;
      prop = "";
    } else if (i !== x.length && start === -1 && isStartChar(char)) {
      start = i;
      startChar = char;
    } else if (!prop && start >= 0 && propEndChar(char)) {
      prop = x.slice(start, i);
      colon = char === 58;
    } else if (valueStart === -1 && prop && !propEndChar(char)) {
      valueStart = i;
      isNumber(char) && (numberStart = i);
    } else if (valueStart !== -1) {
      if (isNumber(char))
        numberStart === -1 && (numberStart = i);
      else if (numberStart > -1)
        addUnit(i);
      if (char === 40)
        fn.push(x.slice(Math.max(lastSpace, valueStart), i));
      else if (char === 41)
        fn.pop();
      else if (char === 9 || char === 32)
        lastSpace = i + 1;
    }
  }
}
function addUnit(i) {
  if (!isUnit(char)) {
    value = value + x.slice(valueStart, i) + getUnit(prop, last(fn));
    valueStart = i;
  }
  numberStart = -1;
}
function renderValue(x2, unit) {
  typeof x2 === "function" && (x2 = value());
  return typeof x2 !== "string" || !isUnit(x2.charCodeAt(x2.length - 1)) ? x2 + unit : x2;
}
function getUnit(prop2, fn2 = "") {
  prop2 = shorthand(prop2);
  const id2 = prop2 + "," + fn2;
  if (id2 in unitCache)
    return unitCache[id2];
  return unitCache[id2] = fn2 && (fn2.indexOf("translate") === 0 || "perspective blur drop-shadow inset polygon".indexOf(fn2) > -1) ? "px" : fn2.indexOf("rotate") === 0 || fn2.indexOf("skew") === 0 ? "deg" : fn2 ? "" : px(prop2);
}
selectors.toString = function() {
  let a = "", b = "";
  selectors.forEach((x2) => x2.charCodeAt(0) === 64 && x2 !== "@font-face" ? a += x2 : b += x2);
  return (a ? a + "{" : "") + (b === "@font-face" ? "" : "&") + b;
};
function px(x2) {
  x2 = shorthand(x2);
  if (x2[0] === "-" && x2[1] === "-" || x2 in pxCache)
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
    if (vendorMap[x2]) {
      console.log(x2, "prefixed to", vendorMap[x2]);
      return vendorMap[x2];
    }
    x2.indexOf("--") !== 0 && console.log(x2, "not found");
  }
  return x2;
}

// src/router.js
var routing = false;
var routeState = {};
function cleanSlash(x2) {
  return String(x2).replace(/\/+/g, "/").replace(/(.)\/$/, "$1");
}
function tokenizePath(x2) {
  return x2.split(/(?=\/)/);
}
function getScore(match, current) {
  return match.reduce((acc, x2, i) => acc + (x2 === "404" ? 1 : x2 === current[i] ? 6 : x2 && current[i] && x2.toLowerCase() === current[i].toLowerCase() ? 5 : x2[1] === ":" && current[i] && current[i].length > 1 ? 4 : x2 === "/" && !current[i] ? 3 : x2 === "*" || x2 === "/*" ? 2 : -Infinity), 0);
}
function params(path2, current) {
  return path2.reduce((acc, x2, i) => {
    x2[1] === ":" && (acc[x2.slice(2)] = decodeURIComponent(current[i].slice(1)));
    return acc;
  }, {});
}
function router(s2, root, attrs2) {
  const routed = s2(async ({ route: route2, key, ...attrs3 }, [view], context) => {
    if (typeof view === "string")
      view = (await import((view[0] === "/" ? "" : route2) + view)).default;
    attrs3.route = route2;
    return () => typeof view === "function" ? view(attrs3, [], { ...context, route: route2 }) : view;
  });
  Object.assign(route, attrs2);
  route.toString = route;
  route.has = (x2) => x2 === "/" ? getPath(route.url) === root || getPath(route.url) === "/" && root === "" : getPath(route.url).indexOf(cleanSlash(root + "/" + x2)) === 0;
  Object.defineProperty(route, "current", {
    get() {
      const path2 = getPath(route.url), idx = path2.indexOf("/", root.length + 1);
      return idx === -1 ? path2 : path2.slice(0, idx);
    }
  });
  return route;
  function getPath(location, x2 = 0) {
    return (s2.pathmode[0] === "#" ? location.hash.slice(s2.pathmode.length + x2) : s2.pathmode[0] === "?" ? location.search.slice(s2.pathmode.length + x2) : location.pathname.slice(s2.pathmode + x2)).replace(/(.)\/$/, "$1");
  }
  function reroute(path2, options = {}) {
    s2.pathmode[0] === "#" ? window.location.hash = s2.pathmode + path2 : s2.pathmode[0] === "?" ? window.location.search = s2.pathmode + path2 : window.history[options.replace ? "replaceState" : "pushState"](options.state, null, s2.pathmode + path2);
    routeState[path2] = options.state;
    s2.redraw();
  }
  function route(routes, options = {}) {
    if (typeof routes === "undefined")
      return root + "/";
    if (typeof routes === "string")
      return reroute(cleanSlash(routes[0] === "/" ? routes : "/" + routes), options);
    if (!routing) {
      routing = true;
      s2.pathmode[0] === "#" ? window.addEventListener("hashchange", () => s2.redraw()) : typeof window.history.pushState === "function" && window.addEventListener("popstate", s2.redraw);
    }
    const path2 = getPath(route.url, root.length);
    const pathTokens = tokenizePath(path2);
    const [_, match, view = options.notFound] = Object.entries(routes).reduce((acc, [match2, view2]) => {
      match2 = tokenizePath(cleanSlash(match2));
      const score = getScore(match2, pathTokens);
      return score > acc[0] ? [score, match2, view2] : acc;
    }, [0]);
    const current = root + (match && match[0] !== "*" ? match.map((x2, i) => pathTokens[i]).join("") : "");
    if (view === void 0 || options.notFound)
      route.notFound(true);
    const subRoute = router(s2, current.replace(/\/$/, ""), attrs2);
    subRoute.parent = route;
    return routed({
      key: current || "/",
      route: subRoute,
      ...root + path2 === current && routeState[root + path2] || {},
      ...params(match || [], pathTokens)
    }, view);
  }
}

// src/shared.js
function ignoredAttr(x2) {
  return x2 === "dom" || x2 === "is" || x2 === "key" || x2 === "handleEvent" || x2 === "class" || x2 === "className";
}
function className(view) {
  return (classes2(view.attrs.class) + classes2(view.attrs.className) + view.tag.classes).trim();
}
function classes2(x2) {
  if (typeof x2 === "function")
    return classes2(x2());
  return x2 ? typeof x2 === "object" ? Object.keys(x2).reduce((acc, c) => acc + x2[c] ? c + " " : "", "") : x2 + " " : "";
}

// src/index.js
var document = window_default.document;
var NS = {
  html: "http://www.w3.org/1999/xhtml",
  svg: "http://www.w3.org/2000/svg",
  math: "http://www.w3.org/1998/Math/MathML"
};
function s(...x2) {
  const type = typeof x2[0];
  return type === "string" ? S(Object.assign([x2[0]], { raw: [] }))(...x2.slice(1)) : S.bind(type === "function" ? new View(x2[0]) : tagged(x2));
}
function S(...x2) {
  return x2[0] && Array.isArray(x2[0].raw) ? S.bind(tagged(x2, this)) : execute(x2, this);
}
var components = new WeakMap();
var removing = new WeakSet();
var streams = new WeakMap();
var arrays = new WeakMap();
var lives = new WeakMap();
var attrs = new WeakMap();
var keyCache = new WeakMap();
var mounts = new Map();
var idle = true;
var afterUpdate = [];
s.pathmode = "";
s.redraw = redraw;
s.mount = mount;
s.css = (...x2) => parse(x2, null, 0, true);
s.animate = animate;
s.http = http;
s.http.redraw = redraw;
s.medias = medias;
s.live = Live;
s.on = on;
s.route = router(s, "", {
  url: typeof window_default !== "undefined" && window_default.location,
  notFound: () => {
  },
  title: () => {
  },
  head: () => {
  }
});
s.request = (url, o) => (o ? http(url, o) : http(url.url, url)).then(({ body }) => body).catch((x2) => (x2.response = x2.body, Promise.reject(x2)));
s.trust = (x2) => s(() => {
  const div2 = document.createElement("div"), frag = new DocumentFragment();
  div2.innerHTML = x2;
  while (div2.lastChild)
    frag.appendChild(div2.lastChild);
  return () => frag;
});
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
  return () => {
    dom.setAttribute("animate", "exit");
    return new Promise((r) => dom.addEventListener("transitionend", r));
  };
}
function link(dom) {
  dom.addEventListener("click", (e) => {
    if (!e.defaultPrevented && (e.button === 0 || e.which === 0 || e.which === 1) && (!e.currentTarget.target || e.currentTarget.target === "_self") && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const state = attrs.get(dom).state;
      window_default.history.pushState(state, null, dom.getAttribute("href"));
      routeState[dom.getAttribute("href")] = state;
      s.redraw();
    }
  });
}
function tagged(x2, parent) {
  const level = parent ? parent.level + 1 : 0;
  return new View(parent && parent.component, parse(x2, parent && parent.tag, level), level);
}
function execute(x2, parent) {
  const hasAttrs = isAttrs(x2 && x2[0]);
  return new View(parent.component, parent.tag, parent ? parent.level + 1 : 0, hasAttrs ? x2.shift() : {}, x2.length === 1 && Array.isArray(x2[0]) ? x2[0] : x2);
}
function isAttrs(x2) {
  return x2 && typeof x2 === "object" && !(x2 instanceof Date) && !Array.isArray(x2) && !(x2 instanceof View);
}
function mount(dom, view, attrs2 = {}, context = {}) {
  if (typeof view !== "function") {
    context = attrs2 || {};
    attrs2 = view || {};
    view = dom;
    dom = document.body;
  }
  attrs2.route = context.route = s.route;
  mounts.set(dom, { view, attrs: attrs2, context });
  draw({ view, attrs: attrs2, context }, dom);
  return view;
}
function redraw() {
  idle && (requestAnimationFrame(globalRedraw), idle = false);
}
function globalRedraw() {
  mounts.forEach(draw);
  idle = true;
}
function draw({ view, attrs: attrs2, context }, dom) {
  updates(dom, [].concat(view(attrs2, [], context)), context);
  afterUpdate.forEach((fn2) => fn2());
  afterUpdate = [];
}
function updates(parent, next, context, before, last2 = parent.lastChild) {
  const keys = next[0] && next[0].key != null && new Array(next.length), ref = before ? before.nextSibling : parent.firstChild, tracked = keyCache.has(ref), after = last2 ? last2.nextSibling : null;
  keys && (keys.rev = {}) && tracked ? keyed(parent, context, keyCache.get(ref), next, keys, after) : nonKeyed(parent, context, next, keys, ref, after);
  const first = before ? before.nextSibling : parent.firstChild;
  if (keys) {
    keyCache.set(first, keys);
    first !== ref && keyCache.delete(ref);
  }
  return Ret(first, after && after.previousSibling || parent.lastChild);
}
function Ref(keys, dom, key, i) {
  keys[i] = { dom, key };
  keys.rev[key] = i;
}
function nonKeyed(parent, context, next, keys, dom, after = null) {
  let i = 0, temp, view;
  while (i < next.length) {
    if (dom === null || !removing.has(dom)) {
      view = next[i];
      temp = dom !== after ? update(dom, view, context, parent) : update(null, view, context);
      dom === after && parent.insertBefore(temp.dom, after);
      keys && Ref(keys, temp.first, view.key, i);
      dom = temp.last;
      i++;
    }
    if (dom !== null) {
      dom = dom.nextSibling;
      dom !== null && dom.nodeType === 8 && dom.nodeValue === "," && (dom = remove(dom, parent).after);
    }
  }
  while (dom && dom !== after)
    dom = remove(dom, parent).after;
}
function keyed(parent, context, as, bs, keys, after) {
  const map = as.rev;
  let ai = as.length - 1, bi = bs.length - 1, a = as[ai], b = bs[bi], temp = -1;
  outer:
    while (true) {
      while (a.key === b.key) {
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
      if (b.key in map) {
        temp = map[b.key];
        if (temp > bi) {
          temp = updateView(as[temp].dom, b, context, parent);
          insertBefore(parent, temp, after);
          after = temp.first;
          Ref(keys, after, b.key, bi);
        } else if (temp !== bi) {
          temp = updateView(as[temp].dom, b, context, parent);
          insertBefore(parent, temp, after);
          after = temp.first;
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
        temp = updateView(null, b, context);
        insertBefore(parent, temp, after);
        after = temp.first;
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
  let temp = first, dom;
  do {
    dom = temp;
    temp = dom.nextSibling;
  } while (parent.insertBefore(dom, before) !== last2);
}
function update(dom, view, context, parent, stack, create) {
  return typeof view === "function" ? view.constructor === Live ? updateLive(dom, view, context, parent, stack, create) : update(dom, view(), context, parent, stack, create) : view instanceof View ? updateView(dom, view, context, parent, stack, create) : Array.isArray(view) ? updateArray(dom, view, context, parent) : view instanceof Node ? Ret(view) : updateValue(dom, view, parent, create);
}
function updateView(dom, view, context, parent, stack, create) {
  return view.component ? updateComponent(dom, view, context, parent, stack, create) : updateElement(dom, view, context, parent, create);
}
function updateLive(dom, view, context, parent) {
  if (streams.has(dom))
    return streams.get(dom);
  let result;
  run(view());
  view.observe(run);
  return result;
  function run(x2) {
    result = update(dom, x2, context, parent || dom && dom.parentNode);
    streams.set(result.first, result);
    dom && dom !== result.first && streams.delete(dom);
    dom = result.first;
  }
}
function Ret(dom, first = dom, last2 = first) {
  return { dom, first, last: last2 };
}
function updateArray(dom, view, context, parent) {
  const last2 = arrays.has(dom) ? arrays.get(dom) : dom;
  const comment = updateValue(dom, "[" + view.length, parent, false, 8);
  if (parent) {
    const after = last2 ? last2.nextSibling : null;
    updates(parent, view, context, comment.first, last2);
    const nextLast = after ? after.previousSibling : parent.lastChild;
    last2 !== nextLast && arrays.set(comment.first, nextLast);
    return Ret(comment.dom, comment.first, nextLast);
  }
  parent = new DocumentFragment();
  parent.appendChild(comment.dom);
  updates(parent, view, context, comment.first, last2);
  arrays.set(comment.first, parent.lastChild);
  return Ret(parent, comment.first, parent.lastChild);
}
function updateValue(dom, view, parent, create, nodeType = typeof view === "boolean" || view == null ? 8 : 3) {
  const nodeChange = create || !dom || dom.nodeType !== nodeType;
  nodeChange && replace(dom, dom = nodeType === 8 ? document.createComment(view) : document.createTextNode(view), parent);
  if (!nodeChange && dom.nodeValue !== "" + view)
    dom.nodeValue = view;
  return Ret(dom);
}
function updateElement(dom, view, context, parent, create = dom === null || tagChanged(dom, view)) {
  const previousNS = context.NS;
  create && replace(dom, dom = createElement(view, context), parent);
  const prev = attributes(dom, view, context, create);
  view.attrs.domSize = view.children && view.children.length;
  view.attrs.domSize ? updates(dom, view.children, context) : prev && prev.domSize && dom.hasChildNodes() && removeChildren(dom.firstChild, dom);
  context.NS = previousNS;
  return Ret(dom);
}
function tagChanged(dom, view) {
  return dom.tagName !== (view.tag.name || "DIV").toUpperCase();
}
function createElement(view, context) {
  const is = view.attrs.is;
  return context.NS || (context.NS = view.attrs.xmlns || NS[view.tag.name]) ? is ? document.createElementNS(context.NS, view.tag.name, { is }) : document.createElementNS(context.NS, view.tag.name) : is ? document.createElement(view.tag.name || "DIV", { is }) : document.createElement(view.tag.name || "DIV");
}
function removeChildren(dom, parent) {
  do
    dom = remove(dom, parent).after;
  while (dom);
}
function Stack(context) {
  const life = [];
  context.onremove = (fn2) => life.push(() => fn2);
  const xs = [];
  let i = 0, top = 0;
  return {
    life,
    get exhausted() {
      return i >= xs.length;
    },
    get key() {
      return i < xs.length ? xs[i].key : null;
    },
    next(instance) {
      if (arguments.length) {
        xs.length = i;
        xs[i] = { key: null, instance };
      }
      return i < xs.length && xs[top = i++];
    },
    pop() {
      return --i === 0 && !(xs.length = top + 1, top = 0);
    }
  };
}
function updateComponent(dom, view, context, parent, stack = components.has(dom) ? components.get(dom) : Stack(context), create = stack.exhausted || stack.key !== view.key) {
  const x2 = create ? stack.next(view.component(view.attrs, view.children, context)) : stack.next();
  const promise = x2.instance && typeof x2.instance.then === "function";
  view.key && (x2.key = view.key);
  let next;
  if (promise) {
    next = updateValue(dom, "pending", parent, false, 8);
    create && x2.instance.catch((x3) => (console.error(x3), x3)).then((view2) => {
      if (!components.has(next.first))
        return;
      x2.instance = view2;
      redraw();
    });
  } else {
    next = update(dom, mergeTag(typeof x2.instance === "function" ? x2.instance(view.attrs, view.children, context) : create ? x2.instance : view.component(view.attrs, view.children, context), view), context, parent, stack, create || void 0);
  }
  const changed = dom !== next.first;
  stack.pop() && (changed || create) && (changed && components.delete(dom), components.set(next.first, stack), !promise && giveLife(next.first, view.attrs, view.children, context, stack.life));
  return next;
}
function mergeTag(a, b) {
  if (!b?.tag)
    return a;
  if (!a?.tag)
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
function empty(o) {
  for (const x2 in o)
    return false;
  return true;
}
function attributes(dom, view, context, init) {
  let tag = view.tag, attr, value2;
  const prev = !init && attrs.has(dom) ? attrs.get(dom) : void 0;
  prev && view.attrs && (view.attrs.handleEvent = prev.handleEvent);
  "id" in view.attrs === false && view.tag.id && (view.attrs.id = view.tag.id);
  if (init && view.tag.classes || view.attrs.class !== (prev && prev.class) || view.attrs.className !== (prev && prev.className))
    dom.className = className(view);
  init && view.attrs.class?.observe(() => dom.className = className(view));
  init && view.attrs.className?.observe(() => dom.className = className(view));
  for (attr in view.attrs) {
    if (!ignoredAttr(attr) && (!prev || prev[attr] !== view.attrs[attr])) {
      value2 = view.attrs[attr];
      init && initLive(dom, attr, value2, context);
      updateAttribute(dom, context, view.attrs, attr, prev && prev[attr], value2);
      value2 = true;
    }
  }
  if (prev) {
    for (const attr2 in prev) {
      if (attr2 in view.attrs === false) {
        isEvent(attr2) ? removeEvent(dom, attrs, attr2) : dom.removeAttribute(attr2);
      }
    }
  }
  if (view.tag) {
    setVars(dom, view.tag.vars, view.tag.args, init);
    while (tag = tag.parent)
      setVars(dom, tag.vars, tag.args, init);
  }
  init && view.attrs.dom && giveLife(dom, view.attrs, view.children, context, view.attrs.dom);
  value2 ? attrs.set(dom, view.attrs) : prev && empty(view.attrs) && attrs.delete(dom);
  return prev;
}
function initLive(dom, attr, value2, context) {
  if (value2 && value2.constructor === Live)
    value2.observe((x2) => setAttribute(dom, attr, x2, context));
}
function setVars(dom, vars, args, init) {
  for (const id2 in vars) {
    const { unit, index } = vars[id2];
    const value2 = args[index];
    setVar(dom, id2, value2, unit, init);
  }
}
function setVar(dom, id2, value2, unit, init, after) {
  if (typeof value2 !== "function") {
    dom.style.setProperty(id2, renderValue(value2, unit));
    after && afterUpdate.push(() => dom.style.setProperty(id2, renderValue(value2, unit)));
    return;
  }
  if (value2.constructor !== Live)
    return setVar(dom, id2, value2(dom), unit, init, init);
  if (init) {
    value2.observe((x2) => dom.style.setProperty(id2, renderValue(x2, unit)));
    setVar(dom, id2, value2(), unit, init, init);
  }
}
function giveLife(dom, attrs2, children, context, life) {
  afterUpdate.push(() => {
    life = [].concat(life).map((x2) => typeof x2 === "function" && x2(dom, attrs2, children, context)).filter((x2) => typeof x2 === "function");
    life.length && lives.set(dom, (lives.get(dom) || []).concat(life));
  });
}
function updateAttribute(dom, context, attrs2, attr, old, value2) {
  if (old === value2)
    return;
  if (attr === "href" && value2 && !value2.match(/^([a-z]+:)?\/\//)) {
    value2 = s.pathmode + cleanSlash(value2);
    link(dom);
  }
  const on2 = isEvent(attr);
  if (on2 && typeof old === typeof value2)
    return;
  on2 ? value2 ? addEvent(dom, attrs2, attr) : removeEvent(dom, attrs2, attr) : setAttribute(dom, attr, value2, context);
}
function setAttribute(dom, attr, value2, context) {
  if (typeof value2 === "function")
    return setAttribute(dom, attr, value2(), context);
  !value2 && value2 !== 0 ? dom.removeAttribute(attr) : !context.NS && attr in dom && typeof value2 !== "boolean" ? dom[attr] = value2 : dom.setAttribute(attr, value2 === true ? "" : value2);
}
function isEvent(x2) {
  return x2.charCodeAt(0) === 111 && x2.charCodeAt(1) === 110;
}
function removeEvent(dom, attrs2, name2) {
  dom.removeEventListener(name2.slice(2), attrs2.handleEvent);
}
function addEvent(dom, attrs2, name2) {
  !attrs2.handleEvent && (attrs2.handleEvent = handleEvent(dom));
  dom.addEventListener(name2.slice(2), attrs2.handleEvent);
}
function handleEvent(dom) {
  return {
    handleEvent: (e) => callHandler(attrs.get(dom)["on" + e.type], e)
  };
}
function callHandler(handler, e) {
  const result = typeof handler === "function" ? handler.call(e.currentTarget, e) : typeof handler.handleEvent === "function" && handler.handleEvent(e);
  e.redraw !== false && handler.constructor !== Live && redraw();
  result && typeof result.then === "function" && result.then(redraw);
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
function defer(dom, parent, children) {
  if (!lives.has(dom))
    return children.length && (removing.add(dom), Promise.allSettled(children));
  const life = lives.get(dom).map((x2) => x2()).filter((x2) => x2 && typeof x2.then === "function");
  lives.delete(dom);
  if (life.length === 0)
    return children.length && (removing.add(dom), Promise.allSettled(children));
  removing.add(dom);
  return Promise.allSettled(life.concat(children)).then(() => {
    removing.delete(dom);
    remove(dom, parent);
  });
}
function removeArray(dom, parent, lives2) {
  if (!arrays.has(dom))
    return dom.nextSibling;
  const last2 = arrays.get(dom);
  if (dom === last2)
    return dom.nextSibling;
  const after = last2.nextSibling;
  dom = dom.nextSibling;
  if (!dom)
    return after;
  do {
    const x2 = remove(dom, parent, false);
    x2.life && lives2.push(x2.life);
    dom = x2.after;
  } while (dom && dom !== after);
  return after;
}
function remove(dom, parent, instant = true) {
  if (!parent || removing.has(dom))
    return { after: dom.nextSibling, life: null };
  const lives2 = [];
  let after = dom.nextSibling;
  if (dom.nodeType === 8)
    after = removeArray(dom, parent, lives2);
  if (dom.nodeType !== 1) {
    instant && parent.removeChild(dom);
    return { after, life: null };
  }
  let child = dom.firstChild;
  while (child !== null) {
    const life2 = remove(child, dom, false).life;
    life2 && lives2.push(life2);
    child = child.nextSibling;
  }
  const life = defer(dom, parent, lives2);
  instant && !life && parent.removeChild(dom);
  return {
    after,
    life
  };
}
export {
  s as default
};
