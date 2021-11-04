// window.js
var window_default = typeof window !== "undefined" ? window : proxy();
function proxy() {
  return {
    location: {},
    document: {
      createElement: (x2) => {
        const dom2 = {
          tagName: x2.toUpperCase(),
          setAttribute: (x3, v) => dom2.x = v,
          getAttribute: (x3) => dom2[x3]
        };
        return dom2;
      }
    }
  };
}

// parse.js
var parse_default = parse;
var document = window_default.document;
var style = document && document.querySelector && (document.querySelector(".sin") || document.createElement("style"));
var prefix = style && style.getAttribute("id") || "sin-" + ("000000" + (Math.random() * Math.pow(36, 6) | 0).toString(36)).slice(-6);
var dom = document.createElement("div");
var vendorRegex = /^(o|O|ms|MS|Ms|moz|Moz|webkit|Webkit|WebKit)([A-Z])/;
var snake = (x2) => x2.replace(/(\B[A-Z])/g, "-$1").toLowerCase();
var findWidth = (x2) => x2 ? x2.hasOwnProperty("width") ? x2 : findWidth(Object.getPrototypeOf(x2)) : {};
var initials = (acc, x2) => (acc[x2.split("-").map((x3) => x3[0]).join("")] = x2, acc);
var propCache = {};
var atsCache = {};
var unitCache = {};
var atReplacer = (x2) => Object.entries(x2).forEach(([k, v]) => atsCache["@" + k] = v);
parse.prefix = prefix;
var pxCache = {
  flex: "",
  "line-height": "",
  border: "px",
  transform: "px",
  "box-shadow": "px",
  "border-top": "px",
  "border-left": "px",
  "border-right": "px",
  "border-bottom": "px",
  "@media": "px"
};
var properties = ["float"].concat(Object.keys(document.documentElement ? findWidth(document.documentElement.style) : {})).filter((x2, i, xs) => x2.indexOf("-") === -1 && x2 !== "length" && xs.indexOf(x2) === i).map((x2) => x2.match(vendorRegex) ? "-" + snake(x2) : snake(x2)).sort();
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
var popular = ["align-items", "bottom", "background-color", "border-radius", "box-shadow", "background-image", "color", "display", "float", "flex-direction", "font-family", "font-size", "height", "justify-content", "left", "line-height", "letter-spacing", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "opacity", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "right", "top", "text-align", "text-decoration", "text-transform", "width"];
var shorthands = Object.assign(properties.reduce(initials, {}), popular.reduce(initials, {}));
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
var uid = 0;
var className = "";
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
function shorthand(x2) {
  return shorthands[x2] || x2;
}
function propValue(x2, v) {
  return colon ? x2 : renderProp(x2) + ":" + v + ";";
}
function renderProp(x2) {
  return propCache[x2] || (propCache[x2] = vendor(shorthand(x2)));
}
function splitSelector(x2) {
  return x2.replace(/,\s*[:[]?/g, (x3) => noSpace(x3.charCodeAt(x3.length - 1)) ? ",&" + last(x3) : ",& ");
}
function insert(rule2, index) {
  if (append) {
    style && document.head && document.head.appendChild(style);
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
  selectors.length = 0;
  valueStart = -1;
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
        vars[varName = "--" + prefix + uid + j] = { unit: getUnit(prop, last(fn)), index: j };
        value += before + "var(" + varName + ")";
        valueStart = 0;
      } else {
        x += args[j] + ";";
        cacheable = false;
      }
    }
  }
  if (hasRules) {
    if (root) {
      Object.entries(rules).forEach(([k, v]) => insert(k.replace(/&\s*/g, "") + "{" + v));
    } else {
      className = prefix + uid++;
      classes += (classes ? " " : "") + className;
      for (let i = 0; i < nesting; i++)
        className += "." + className;
      Object.entries(rules).forEach(([k, v]) => {
        insert(k.replace(/&/g, "." + className) + "{" + v);
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
  return atsCache[x2] || x2;
}
function parseStyles(idx, end) {
  for (let i = idx; i <= x.length; i++) {
    char = x.charCodeAt(i);
    if (quote === -1 && valueStart >= 0 && (colon ? char === 59 : valueEndChar(char))) {
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
        selectors.push((noSpace(startChar) ? "" : " ") + selector);
        path = selectors.toString();
        rule = rules[path || "&"] || "";
      }
      start = valueStart = -1;
      prop = "";
    } else if (char === 125 || i === x.length && end) {
      if (keyframe) {
        keyframes += keyframe + "{" + rule + "}";
        keyframe = rule = "";
      } else if (animation) {
        insert("@keyframes " + prefix + ++uid + "{" + keyframes + "}");
        rule = (rules[path || "&"] || "") + propValue("animation", animation + " " + prefix + uid);
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
  return typeof x2 !== "string" || isUnit(x2.charCodeAt(x2.length - 1)) ? x2 + unit : x2;
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
  selectors.forEach((x2) => x2.charCodeAt(0) === 64 ? a += x2 : b += x2);
  return (a ? a + "{" : "") + "&" + b;
};
function px(x2) {
  x2 = shorthand(x2);
  if (x2[0] === "-" && x2[1] === "-" || x2 in pxCache)
    return pxCache[x2];
  try {
    dom.style[x2] = "1px";
    dom.style.setProperty(x2, "1px");
    return pxCache[x2] = dom.style[x2].slice(-3) === "1px" ? "px" : "";
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

// router.js
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
function reroute(s2, path2, options = {}) {
  s2.pathmode[0] === "#" ? window.location.hash = s2.pathmode + path2 : s2.pathmode[0] === "?" ? window.location.search = s2.pathmode + path2 : window.history[options.replace ? "replaceState" : "pushState"](options.state, null, s2.pathmode + path2);
  routeState[path2] = options.state;
  s2.redraw();
}
function getPath(s2, location, x2 = 0) {
  return (s2.pathmode[0] === "#" ? location.hash.slice(s2.pathmode.length + x2) : s2.pathmode[0] === "?" ? location.search.slice(s2.pathmode.length + x2) : location.pathname.slice(s2.pathmode + x2)).replace(/(.)\/$/, "$1");
}
function router(s2, root, attrs2) {
  const routed = s2(({ route: route2, key, ...attrs3 }, [view], context) => {
    context.route = route2;
    return () => typeof view === "function" ? view(attrs3, [], context) : view;
  });
  Object.assign(route, attrs2);
  route.toString = route;
  route.has = (x2) => x2 === "/" ? getPath(s2, route.url) === root || getPath(s2, route.url) === "/" && root === "" : getPath(s2, route.url).indexOf(cleanSlash(root + "/" + x2)) === 0;
  Object.defineProperty(route, "current", {
    get() {
      const path2 = getPath(s2, route.url), idx = path2.indexOf("/", root.length + 1);
      return idx === -1 ? path2 : path2.slice(0, idx);
    }
  });
  return route;
  function route(routes, options = {}) {
    if (typeof routes === "undefined")
      return root + "/";
    if (typeof routes === "string")
      return reroute(s2, cleanSlash(routes[0] === "/" ? routes : "/" + routes), options);
    if (!routing) {
      routing = true;
      s2.pathmode[0] === "#" ? window.addEventListener("hashchange", () => s2.redraw()) : typeof window.history.pushState === "function" && window.addEventListener("popstate", s2.redraw);
    }
    const path2 = getPath(s2, route.url, root.length);
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

// view.js
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

// http.js
["get", "put", "post", "delete", "patch"].forEach((x2) => http[x2] = function(url, object) {
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
  config = (xhr) => {
  },
  raw = false
} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        let body2 = xhr.responseText, error;
        if (!raw) {
          try {
            body2 = JSON.parse(xhr.responseText);
          } catch (e) {
            error = e;
          }
        }
        (error || xhr.status >= 300 ? reject : resolve)({
          status: xhr.status,
          body: body2,
          xhr
        });
        redraw2 && http.redraw();
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

// stream.js
var stream_default = Stream;
Stream.SKIP = {};
Stream.lift = lift;
Stream.scan = scan;
Stream.merge = merge;
Stream.combine = combine;
Stream.scanMerge = scanMerge;
Stream["fantasy-land/of"] = Stream;
function Stream(value2) {
  const dependentStreams = [];
  const dependentFns = [];
  function stream(v) {
    if (arguments.length && v !== Stream.SKIP) {
      value2 = v;
      if (open(stream)) {
        stream._changing();
        stream._state = "active";
        dependentStreams.forEach((s2, i) => s2(dependentFns[i](value2)));
      }
    }
    return value2;
  }
  stream.constructor = Stream;
  stream._state = arguments.length && value2 !== Stream.SKIP ? "active" : "pending";
  stream._parents = [];
  stream._changing = () => {
    if (open(stream))
      stream._state = "changing";
    dependentStreams.forEach((s2) => s2._changing());
  };
  stream._map = (fn2, ignoreInitial) => {
    const target = ignoreInitial ? Stream() : Stream(fn2(value2));
    target._parents.push(stream);
    dependentStreams.push(target);
    dependentFns.push(fn2);
    return target;
  };
  stream.map = (fn2) => stream._map(fn2, stream._state !== "active");
  let end;
  function createEnd() {
    end = Stream();
    end.map((value3) => {
      if (value3 === true) {
        stream._parents.forEach((p) => p._unregisterChild(stream));
        stream._state = "ended";
        stream._parents.length = dependentStreams.length = dependentFns.length = 0;
      }
      return value3;
    });
    return end;
  }
  stream.toJSON = () => value2 != null && typeof value2.toJSON === "function" ? value2.toJSON() : value2;
  stream.toString = stream;
  stream.valueOf = stream;
  stream["fantasy-land/map"] = stream.map;
  stream["fantasy-land/ap"] = (x2) => combine((s1, s2) => s1()(s2()), [x2, stream]);
  stream._unregisterChild = (child) => {
    const childIndex = dependentStreams.indexOf(child);
    if (childIndex !== -1) {
      dependentStreams.splice(childIndex, 1);
      dependentFns.splice(childIndex, 1);
    }
  };
  Object.defineProperty(stream, "end", {
    get: () => end || createEnd()
  });
  return stream;
}
function combine(fn2, streams2) {
  let ready = streams2.every((s2) => {
    if (s2.constructor !== Stream)
      throw new Error("Ensure that each item passed to stream.combine/stream.merge/lift is a stream");
    return s2._state === "active";
  });
  const stream = ready ? Stream(fn2.apply(null, streams2.concat([streams2]))) : Stream();
  let changed = [];
  const mappers = streams2.map((s2) => s2._map((value2) => {
    changed.push(s2);
    if (ready || streams2.every((s3) => s3._state !== "pending")) {
      ready = true;
      stream(fn2.apply(null, streams2.concat([changed])));
      changed = [];
    }
    return value2;
  }, true));
  const endStream = stream.end.map((value2) => {
    if (value2 === true) {
      mappers.forEach((mapper) => mapper.end(true));
      endStream.end(true);
    }
    return void 0;
  });
  return stream;
}
function merge(streams2) {
  return combine(() => streams2.map((s2) => s2()), streams2);
}
function scan(fn2, acc, origin) {
  const stream = origin.map((v) => {
    const next = fn2(acc, v);
    if (next !== Stream.SKIP)
      acc = next;
    return next;
  });
  stream(acc);
  return stream;
}
function scanMerge(tuples, seed) {
  const streams2 = tuples.map((tuple) => tuple[0]);
  const stream = combine(() => {
    const changed = arguments[arguments.length - 1];
    streams2.forEach((stream2, i) => {
      if (changed.indexOf(stream2) > -1)
        seed = tuples[i][1](seed, stream2());
    });
    return seed;
  }, streams2);
  stream(seed);
  return stream;
}
function lift() {
  const fn2 = arguments[0];
  const streams2 = Array.prototype.slice.call(arguments, 1);
  return merge(streams2).map((streams3) => fn2.apply(void 0, streams3));
}
function open(s2) {
  return s2._state === "pending" || s2._state === "active" || s2._state === "changing";
}

// shared.js
function ignoredAttr(x2) {
  return x2 === "id" || x2 === "is" || x2 === "key" || x2 === "handleEvent" || x2 === "class" || x2 === "className";
}
function className2(view) {
  return (classes2(view.attrs.class) + classes2(view.attrs.className) + view.tag.classes).trim();
}
function classes2(x2) {
  return x2 ? typeof x2 === "object" ? Object.keys(x2).reduce((acc, c) => acc + x2[c] ? c + " " : "", "") : x2 + " " : "";
}

// index.js
var document2 = window_default.document;
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
var rarrays = new WeakMap();
var lives = new WeakMap();
var attrs = new WeakMap();
var keyCache = new WeakMap();
var mounts = new Map();
var resolved = Promise.resolve();
var idle = true;
s.pathmode = "";
s.redraw = redraw;
s.mount = mount;
s.stream = stream_default;
s.css = (xs, ...args) => parse_default([xs, args], null, 0, true);
s.animate = animate;
s.route = router(s, "", {
  url: typeof window_default !== "undefined" && window_default.location,
  notFound: () => {
  },
  title: () => {
  },
  head: () => {
  }
});
s.http = http;
s.http.redraw = redraw;
s.request = (url, o) => (o ? http(url, o) : http(url.url, url)).then(({ body }) => body).catch((x2) => (x2.response = x2.body, Promise.reject(x2)));
s.bss = { at: atReplacer, global: s.css };
s.trust = (x2) => s(() => {
  const div = document2.createElement("div"), frag = new DocumentFragment();
  div.innerHTML = x2;
  while (div.lastChild)
    frag.appendChild(div.lastChild);
  return () => frag;
});
function animate(dom2) {
  dom2.setAttribute("animate", "entry");
  requestAnimationFrame(() => dom2.removeAttribute("animate"));
  return () => {
    dom2.setAttribute("animate", "exit");
    return new Promise((r) => dom2.addEventListener("transitionend", r));
  };
}
function link(dom2) {
  dom2.addEventListener("click", (e) => {
    if (!e.defaultPrevented && (e.button === 0 || e.which === 0 || e.which === 1) && (!e.currentTarget.target || e.currentTarget.target === "_self") && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const state = attrs.get(dom2).state;
      window_default.history.pushState(state, null, dom2.getAttribute("href"));
      routeState[dom2.getAttribute("href")] = state;
      s.redraw();
    }
  });
}
function tagged(x2, parent) {
  const level = parent ? parent.level + 1 : 0;
  return new View(parent && parent.component, parse_default(x2, parent && parent.tag, level), level);
}
function execute(x2, parent) {
  const hasAttrs = isAttrs(x2 && x2[0]);
  return new View(parent.component, parent.tag, parent ? parent.level + 1 : 0, hasAttrs ? x2.shift() : {}, x2.length === 1 && Array.isArray(x2[0]) ? x2[0] : x2);
}
function isAttrs(x2) {
  return x2 && typeof x2 === "object" && !(x2 instanceof Date) && !Array.isArray(x2) && !(x2 instanceof View);
}
function mount(dom2, view, attrs2 = {}, context = {}) {
  if (typeof view !== "function") {
    context = attrs2 || {};
    attrs2 = view || {};
    view = dom2;
    dom2 = document2.body;
  }
  mounts.set(dom2, { view, attrs: attrs2, context });
  redraw();
  return view;
}
function redraw() {
  idle && (resolved.then(globalRedraw), idle = false);
}
function globalRedraw() {
  mounts.forEach(({ view, attrs: attrs2, context }, dom2) => updates(dom2, [].concat(view(attrs2, [], context)), context));
  idle = true;
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
function Ref(keys, dom2, key, i) {
  keys[i] = { dom: dom2, key };
  keys.rev[key] = i;
}
function nonKeyed(parent, context, next, keys, dom2, after = null) {
  let i = 0, temp, view;
  while (i < next.length) {
    if (!removing.has(dom2)) {
      view = next[i];
      temp = dom2 !== after ? update(dom2, view, context, parent) : update(null, view, context);
      dom2 === after && parent.insertBefore(temp.dom, after);
      keys && Ref(keys, temp.first, view.key, i);
      dom2 = temp.last;
      i++;
    }
    dom2 && (dom2 = dom2.nextSibling);
  }
  while (dom2 && dom2 !== after)
    dom2 = remove(dom2, parent).after;
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
  let temp = first, dom2;
  do {
    dom2 = temp;
    temp = dom2.nextSibling;
  } while (parent.insertBefore(dom2, before) !== last2);
}
function update(dom2, view, context, parent, stack, create) {
  return typeof view === "function" ? view.constructor === stream_default ? updateStream(dom2, view, context, parent) : update(dom2, view(), context, parent, stack, create) : view instanceof View ? updateView(dom2, view, context, parent, stack, create) : Array.isArray(view) ? updateArray(dom2, view, context, parent) : view instanceof Node ? Ret(view) : updateValue(dom2, view, parent, create);
}
function updateView(dom2, view, context, parent, stack, create) {
  return view.component ? updateComponent(dom2, view, context, parent, stack, create) : updateElement(dom2, view, context, parent, create);
}
function updateStream(dom2, view, context, parent) {
  if (streams.has(dom2))
    return streams.get(dom2);
  let newDom, first;
  view.map((x2) => {
    newDom = update(dom2, x2, context, parent);
    first = arrays.has(newDom) ? arrays.get(newDom).dom : newDom;
    dom2 !== first && (dom2 && streams.delete(dom2), streams.set(first, newDom));
    dom2 = first;
  });
  return Ret(newDom);
}
function Ret(dom2, first = dom2, last2 = first) {
  return { dom: dom2, first, last: last2 };
}
function updateArray(dom2, view, context, parent) {
  const last2 = arrays.has(dom2) ? arrays.get(dom2) : dom2;
  const comment = updateValue(dom2, "[" + view.length, parent, false, 8);
  if (parent) {
    const after = last2 ? last2.nextSibling : null;
    updates(parent, view, context, comment.first, last2);
    const nextLast = after ? after.previousSibling : parent.lastChild;
    last2 !== nextLast && arrays.set(comment.first, nextLast);
    rarrays.set(nextLast, comment.first);
    return Ret(comment.dom, comment.first, nextLast);
  }
  parent = new DocumentFragment();
  parent.appendChild(comment.dom);
  updates(parent, view, context, comment.first, last2);
  arrays.set(comment.first, parent.lastChild);
  rarrays.set(parent.lastChild, comment.first);
  return Ret(parent, comment.first, parent.lastChild);
}
function updateValue(dom2, view, parent, create, nodeType = typeof view === "boolean" || view == null ? 8 : 3) {
  const nodeChange = create || !dom2 || dom2.nodeType !== nodeType;
  nodeChange && replace(dom2, dom2 = nodeType === 8 ? document2.createComment(view) : document2.createTextNode(view), parent);
  if (!nodeChange && dom2.nodeValue !== "" + view)
    dom2.nodeValue = view;
  return Ret(dom2);
}
function updateElement(dom2, view, context, parent, create = dom2 === null || dom2.tagName !== (view.tag.name || "DIV").toUpperCase()) {
  const previousNS = context.NS;
  create && replace(dom2, dom2 = createElement(view, context), parent);
  view.children && view.children.length ? updates(dom2, view.children, context) : dom2.hasChildNodes() && removeChildren(dom2.firstChild, dom2);
  attributes(dom2, view, context, create);
  context.NS = previousNS;
  return Ret(dom2);
}
function createElement(view, context) {
  const is = view.attrs.is;
  return context.NS || (context.NS = view.attrs.xmlns || NS[view.tag.name]) ? is ? document2.createElementNS(context.NS, view.tag.name, { is }) : document2.createElementNS(context.NS, view.tag.name) : is ? document2.createElement(view.tag.name || "DIV", { is }) : document2.createElement(view.tag.name || "DIV");
}
function removeChildren(dom2, parent) {
  do
    dom2 = remove(dom2, parent).after;
  while (dom2);
}
function Stack(context) {
  const life = [];
  context.life = (fn2) => Array.isArray(fn2) ? life.push(...fn2) : life.push(fn2);
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
function updateComponent(dom2, view, context, parent, stack = components.has(dom2) ? components.get(dom2) : Stack(context), create = stack.exhausted || stack.key !== view.key) {
  const x2 = create ? stack.next(view.component(view.attrs, view.children, context)) : stack.next();
  const promise = x2.instance && typeof x2.instance.then === "function";
  view.key && (x2.key = view.key);
  let next;
  if (promise) {
    next = updateValue(dom2, "pending", parent, false, 8);
    create && x2.instance.catch((x3) => (console.error(x3), x3)).then((view2) => {
      if (!components.has(next.first))
        return;
      x2.instance = view2;
      redraw();
    });
  } else {
    next = update(dom2, mergeTag(typeof x2.instance === "function" ? x2.instance(view.attrs, view.children, context) : create ? x2.instance : view.component(view.attrs, view.children, context), view), context, parent, stack, create || void 0);
  }
  const changed = dom2 !== next.first;
  stack.pop() && (changed || create) && (changed && components.delete(dom2), components.set(next.first, stack), !promise && giveLife(next.first, view.attrs, view.children, context, stack.life));
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
function attributes(dom2, view, context, init) {
  let has = false, tag = view.tag, attr;
  const prev = attrs.has(dom2) ? attrs.get(dom2) : void 0;
  prev && view.attrs && (view.attrs.handleEvent = prev.handleEvent);
  for (attr in view.attrs) {
    if (attr === "life") {
      init && giveLife(dom2, view.attrs, view.children, context, view.attrs.life);
    } else if (!ignoredAttr(attr) && (!prev || prev[attr] !== view.attrs[attr])) {
      !has && (has = true);
      updateAttribute(dom2, context, view.attrs, attr, prev && prev[attr], view.attrs[attr]);
    }
  }
  if (attrs && prev) {
    for (const attr2 in prev) {
      if (attr2 in view.attrs === false) {
        isEvent(attr2) ? removeEvent(dom2, attrs, attr2) : dom2.removeAttribute(attr2);
      }
    }
  }
  const id2 = view.attrs.id ? view.attrs.id : view.tag.id;
  if (id2 !== dom2.getAttribute("id"))
    id2 ? dom2.setAttribute("id", id2) : dom2.removeAttribute("id");
  if (init && view.tag.classes || view.attrs.class !== prev && prev.class || view.attrs.className !== prev && prev.className)
    dom2.className = className2(view);
  if (view.tag) {
    setVars(dom2, view.tag.vars, view.tag.args, init);
    while (tag = tag.parent)
      setVars(dom2, tag.vars, tag.args, init);
  }
  has ? attrs.set(dom2, view.attrs) : prev && empty(view.attrs) && attrs.delete(dom2);
}
function setVars(dom2, vars, args, init) {
  for (const id2 in vars) {
    const { unit, index } = vars[id2];
    const value2 = args[index];
    value2 && value2.constructor === stream_default ? init && value2.map((x2) => dom2.style.setProperty(id2, renderValue(x2, unit))) : dom2.style.setProperty(id2, renderValue(typeof value2 === "function" ? value2(dom2) : value2, unit));
  }
}
function giveLife(dom2, attrs2, children, context, life) {
  life = [].concat(life).map((x2) => typeof x2 === "function" && x2(dom2, attrs2, children, context)).filter((x2) => typeof x2 === "function");
  life.length && lives.set(dom2, (life.get(dom2) || []).concat(life));
}
function updateAttribute(dom2, context, attrs2, attr, old, value2) {
  if (old === value2)
    return;
  if (attr === "href" && value2 && !value2.match(/^([a-z]+:)?\/\//)) {
    value2 = s.pathmode + cleanSlash(value2);
    link(dom2);
  }
  const on = isEvent(attr);
  if (on && typeof old === typeof value2)
    return;
  on ? value2 ? addEvent(dom2, attrs2, attr) : removeEvent(dom2, attrs2, attr) : !value2 && value2 !== 0 ? dom2.removeAttribute(attr) : !context.NS && attr in dom2 && typeof value2 !== "boolean" ? dom2[attr] = value2 : dom2.setAttribute(attr, value2 === true ? "" : value2);
}
function isEvent(x2) {
  x2.charCodeAt(0) === 111 && x2.charCodeAt(1) === 110;
}
function removeEvent(dom2, attrs2, name2) {
  dom2.removeEventListener(name2.slice(2), attrs2.handleEvent);
}
function addEvent(dom2, attrs2, name2) {
  !attrs2.handleEvent && (attrs2.handleEvent = handleEvent(dom2));
  dom2.addEventListener(name2.slice(2), attrs2.handleEvent);
}
function handleEvent(dom2) {
  return {
    handleEvent: function(e) {
      const handler = attrs.get(dom2)["on" + e.type];
      const result = typeof handler === "function" ? handler.call(e.currentTarget, e) : handler && typeof handler.handleEvent === "function" && handler.handleEvent(e);
      e.redraw !== false && redraw();
      result && typeof result.then === "function" && result.then(redraw);
    }
  };
}
function replace(old, dom2, parent) {
  if (!parent)
    return;
  if (old) {
    parent.insertBefore(dom2, old);
    remove(old, parent);
  }
  return dom2;
}
function defer(dom2, parent, children) {
  if (!lives.has(dom2))
    return children.length && (removing.add(dom2), Promise.allSettled(children));
  const life = lives.get(dom2).map((x2) => x2()).filter((x2) => x2 && typeof x2.then === "function");
  lives.delete(dom2);
  if (life.length === 0)
    return children.length && (removing.add(dom2), Promise.allSettled(children));
  removing.add(dom2);
  return Promise.allSettled(life.concat(children)).then(() => {
    removing.delete(dom2);
    remove(dom2, parent);
  });
}
function removeArray(dom2, parent, lives2) {
  if (!arrays.has(dom2))
    return dom2.nextSibling;
  const last2 = arrays.get(dom2);
  if (dom2 === last2)
    return dom2.nextSibling;
  const after = last2.nextSibling;
  dom2 = dom2.nextSibling;
  do {
    const x2 = remove(dom2, parent, false);
    x2.life && lives2.push(x2.life);
    dom2 = x2.after;
  } while (dom2 && dom2 !== after);
  return after;
}
function remove(dom2, parent, instant = true) {
  if (!parent || removing.has(dom2))
    return { after: dom2.nextSibling };
  const lives2 = [];
  let after = dom2.nextSibling;
  if (dom2.nodeType === 8)
    after = removeArray(dom2, parent, lives2);
  if (dom2.nodeType !== 1) {
    instant && parent.removeChild(dom2);
    return { after };
  }
  let child = dom2.firstChild;
  while (child !== null) {
    const life2 = remove(child, dom2, false).life;
    life2 && lives2.push(life2);
    child = child.nextSibling;
  }
  const life = defer(dom2, parent, lives2);
  instant && !life && parent.removeChild(dom2);
  return {
    life,
    after
  };
}
export {
  s as default
};
