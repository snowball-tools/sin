var dn=Object.defineProperty;var T=(e,t)=>()=>(e&&(t=e(e=0)),t);var pn=(e,t)=>{for(var r in t)dn(e,r,{get:t[r],enumerable:!0})};var Zt={};pn(Zt,{default:()=>Y});function Y(...e){return console.log(...e),e.pop()}var Wt=T(()=>{globalThis.p=globalThis.print=globalThis.l=globalThis.log=Y;Y.debug=function(...t){return process.env.DEBUG&&console.log(...t),t.pop()};Y.error=function(...t){return console.error(...t),t.pop()};Y.trace=function(...e){return console.trace?console.trace(...e):console.log(...e),e.pop()};Y.inspect=function(...e){return console.log(...e),e.pop()};Y.observe=function(...e){return console.log(...e),e.pop()}});var w,x=T(()=>{typeof globalThis>"u"&&(window.globalThis=window);w=typeof window>"u"?{}:window});function be(e){return e&&String(e).replace(/\/+/g,"/").replace(/(.)\/$/,"$1")}function nt(e){return be(e).replace("/?","?")}function Ve(e){return e.replace(/(\B[A-Z])/g,"-$1").toLowerCase()}function V(e){return e&&S(e.observe)}function S(e){return typeof e=="function"}function Xt(e){return e&&S(e.then)}function ot(e){return e.charCodeAt(0)===111&&e.charCodeAt(1)===110}function it(e){return e&&Array.isArray(e.raw)}function st(e){return e.charCodeAt(0)===36?"--"+e.slice(1):e.charCodeAt(0)===45&&e.charCodeAt(1)===45?e:null}function at(e){return e==="dom"||e==="is"||e==="key"||e==="handleEvent"||e==="type"||e==="class"||e==="className"||e==="style"||e==="deferrable"||e==="href"}function $(e){for(;e.parent&&!e.name;)e=e.parent;return e.name}function Yt(e){for(;e.parent&&!e.id;)e=e.parent;return e.id}function gn(e){let t=e.classes||"";for(;e.parent;)e=e.parent,t+=" "+e.classes||"";return t}function Gt(e){return(tt(e.attrs.class)+tt(e.attrs.className)+gn(e.tag)).trim()}function je(e){return Array.isArray(e)?e:[e]}function se(){}function Re(e){return st(e)||(e==="cssFloat"?"float":Ve(e))}function tt(e){return V(e)||S(e)?tt(e()):e?typeof e=="object"?mn(e):e+" ":""}function mn(e){let t="";for(let r in e)t+=(t?" ":"")+(e[r]||"");return t}function $e(e,t){e?document.documentElement.style.setProperty("min-width",e+"px"):document.documentElement.style.removeProperty("min-width"),t?document.documentElement.style.setProperty("min-height",t+"px"):document.documentElement.style.removeProperty("min-height")}function ye(e,t,r,n){$e(r,n),window.scrollTo(e||0,t||0)}function Jt(e,t){return!t||!t.tag?e:!e||!e.tag?(e.tag=t.tag,e):(e.tag={id:t.tag.id||e.tag.id,name:t.tag.name||e.tag.name,classes:(e.tag.classes?e.tag.classes+" ":"")+t.tag.classes,args:t.tag.args,vars:t.tag.vars,parent:e.tag},e)}var G,rt,C,ae=T(()=>{G=Symbol("stackTrace"),rt=Promise.resolve(),C={}.hasOwnProperty});var j,_t=T(()=>{x();ae();j=class{constructor(t,r,n=null,o=0,i=null,s=null){if(n&&n.name==="input"&&i&&"value"in i&&!("oninput"in i)&&!i.disabled)throw new Error("oninput handler required when value is set on input - Bypass check by setting oninput: false");this.level=o,this.component=r,this.inline=t,this.tag=n,this.attrs=i,this.key=i?i.key:void 0,this.dom=null,this.children=s,this[G]=C.call(w,G)?new Error().stack:null}}});function le(e,{method:t="GET",redraw:r=!0,responseType:n,json:o="application/json",query:i,body:s,user:a,pass:l,headers:g={},config:h,timeout:f=0,...u}={}){let p=new w.XMLHttpRequest(u),A=!1,d=new Promise((m,O)=>{let X,ie;t=t.toUpperCase(),p.addEventListener("readystatechange",function(){if(p.readyState===p.DONE)try{p.status&&Object.defineProperty(p,"body",{value:X===o?p.response===void 0||p.response===""?void 0:JSON.parse(p.response):p.response}),p.status===304||p.status>=200&&p.status<300?m(A?p:p.body):O(wn(p))}catch(R){O(R)}}),p.addEventListener("error",O),p.addEventListener("abort",()=>O(new Error("ABORTED"))),p.open(t,Cn(e,i),!0,a,l),p.timeout=f,n&&(p.responseType=n),Object.entries(g).forEach(([R,He])=>{He&&p.setRequestHeader(R,He),R.toLowerCase()==="accept"&&(X=He),R.toLowerCase()==="content-type"&&(ie=He)}),!X&&!n&&o&&p.setRequestHeader("Accept",X=o),!ie&&s!==void 0&&!yn.some(R=>s instanceof R)&&o&&p.setRequestHeader("Content-Type",ie=o),h&&h(p),p.send(ie===o?JSON.stringify(s):s)}).catch(m=>{let O=Object.assign(new Error(m.message),{...m,url:e,status:p.status,body:p.body||p.response});throw Object.defineProperty(O,"xhr",{value:p}),O});return Object.defineProperty(d,"xhr",{get(){return A=!0,d}}),d}function wn(e){return new Error(e.status?e.status+(e.statusText?" "+e.statusText:""):"Unknown")}function Cn(e,t){let r=new URL(e,"http://x"),n=new URLSearchParams(t||"").toString();return e.split(/\?|#/)[0]+r.search+(n?(r.search?"&":"?")+n:"")+(r.hash||"")}var bn,yn,Qt=T(()=>{x();["head","get","put","post","delete","patch"].forEach(e=>le[e]=function(t,r={}){return r.method=e,le(t,r)});le.redraw=()=>{};bn=typeof Uint8Array>"u"?[]:[Object.getPrototypeOf(Uint8Array)],yn="Blob ArrayBuffer DataView FormData URLSearchParams File".split(" ").map(e=>globalThis[e]).filter(e=>e).concat(bn)});function ce(e,...t){let r=new Set;return t.forEach(a=>S(a)&&r.add(a)),i.value=e,i.observe=a=>(r.add(a),()=>r.delete(a)),i.valueOf=i.toString=i.toJSON=()=>e,i.detach=se,i.reduce=s,i.set=a=>(...l)=>(i(S(a)?a(...l):a),i),i.get=a=>Object.assign(n.bind(null,a),{observe:l=>i.observe(()=>l(n(a)))}),i.if=(...a)=>Object.assign(o.bind(null,...a),{observe:l=>i.observe(g=>l(o(...a)))}),i;function n(a){return S(a)?a(i.value):i.value[a]}function o(a,l=!0,g=!1){return i.value===a?l:g}function i(a){if(!arguments.length)return i.value;let l=e;return i.value=e=a,r.forEach(g=>i.value!==l&&g(i.value,l,()=>r.delete(g))),i.value}function s(a,l){let g=1,h=ce(arguments.length>1?a(l,i.value,g++):i.value);return i.observe(f=>h(a(h.value,f,g++))),h}}function lt(e){return e()}var xt=T(()=>{ae();ce.from=function(...e){let t=e.pop(),r=ce(t(...e.map(lt))),n=e.map(o=>o.observe(()=>r(t(...e.map(lt)))));return r.detach=()=>n.forEach(lt),r}});function rr(e){return e.split(/(?=\/)/)}function Sn(e,t){return e.reduce((r,n,o)=>(n[1]===":"&&(r[n.slice(2)]=decodeURIComponent(t[o].slice(1))),r),{})}function we(e,t,r,n){let o=h.location=r.location,i=e(({key:f,route:u,...b},[p],A)=>(A.route=we(e,f.replace(/\/$/,""),r,u),u.key=f,()=>s(p,b,A)));return h.root=n?n.root:h,h.parent=n||h,h.query=r.query,h.toString=h,h.has=f=>f==="/"?a(o)===t||a(o)==="/"&&t==="":a(o).indexOf(nt(t+"/"+f))===0,Object.defineProperty(h,"path",{get(){let f=a(o),u=f.indexOf("/",t.length+1);return u===-1?f:f.slice(0,u)}}),h;function s(f,u,b){let p=S(f)?f(u,[],b):f;return Xt(p)?e(()=>p)(u):p}function a(f,u=0){return(e.pathmode[0]==="#"?f.hash.slice(e.pathmode.length+u):e.pathmode[0]==="?"?f.search.slice(e.pathmode.length+u):f.pathname.slice(e.pathmode+u)).replace(/(.)\/$/,"$1")}function l(f,{state:u,replace:b=!1,scroll:p=!0}={}){if(f!==a(o)+o.search)return e.pathmode[0]==="#"?w.location.hash=e.pathmode+f:e.pathmode[0]==="?"?w.location.search=e.pathmode+f:w.history[b?"replaceState":"pushState"](u,null,e.pathmode+f),tr[f]=u,f.indexOf(o.search)>-1&&r.query(o.search),e.redraw().then(()=>{p===!1||e.route.scroll===!1?e.route.scroll=void 0:ye()})}function g({state:f={}}={}){e.redraw().then(()=>ye(...f&&f.scroll||[]))}function h(f,u={}){if(typeof f>"u")return t+"/";if(typeof f=="string")return l(nt(f[0]==="/"?f:"/"+f),u);er||(er=!0,e.pathmode[0]==="#"?w.addEventListener("hashchange",g,{passive:!0}):S(w.history.pushState)&&w.addEventListener("popstate",g,{passive:!0}));let b=a(o,t.length),p=rr(b),{match:A,view:d}=vn(f,p),m=t+(A?A.map((O,X)=>O==="/*"||O==="/?"?"":p[X]).join(""):"?");return(d===void 0||A[0]==="/?")&&r.doc.status(404),h.params={...h.parent.params,...Sn(A||[],p)},i({key:m,route:h,...h.params,...t+b===m&&tr[t+b]||w.history.state||{}},d)}}function vn(e,t){let r=0,n,o;function i(s,a){if(s.charCodeAt(0)!==47&&(s="/"+s),s=rr(be(s)),typeof a=="object"&&a!=null){for(let g in a)i(s+g,a[g]);return}let l=En(s,t);l>r&&(r=l,n=s,o=a)}for(let s in e)i(s,e[s]);return{match:n,view:o}}function En(e,t){return e.reduce((r,n,o)=>r+(n==="/?"?1:n===t[o]?7:n&&t[o]&&n.toLowerCase()===t[o].toLowerCase()?6:n[1]===":"&&t[o]&&t[o].length>1?5:n==="/"&&!t[o]?4:n.indexOf("/...")===0?3:n==="/*"?2:-1/0),0)}var er,tr,nr=T(()=>{x();ae();er=!1,tr={}});function ct(e,t){let r=URLSearchParams,n=["append","delete","set","sort"],o=t.search,i=new r(o),s,a=e.live();a.replace=h=>(i=new r(h),g()),a.clear=()=>a.replace("");for(let h in r.prototype)a[h]=(...f)=>(s=l()[h](...f),n.includes(h)&&g(),s);return a;function l(){return o===t.search?i:(o=t.search,i=new r(o))}function g(){let h=t.pathname+(i+""?"?"+(i+"").replace(/=$/g,""):"")+t.hash;location.href.endsWith(h)||(w.history.replaceState(w.history.state,null,h),a(t.search),e.redraw())}}var or=T(()=>{x()});var ut,ir,sr=T(()=>{ut=(e,t)=>(e[t.split("-").map(r=>r[0]).join("")]=t,e),ir=["align-items","bottom","background-color","border-radius","box-shadow","background-image","color","display","flex-grow","flex-basis","float","flex-direction","font-family","font-size","font-weight","gap","grid-area","grid-gap","grid-template-area","grid-template-columns","grid-template-rows","height","justify-content","left","line-height","letter-spacing","margin","margin-bottom","margin-left","margin-right","margin-top","opacity","padding","padding-bottom","padding-left","padding-right","padding-top","place-items","pointer-events","right","top","text-align","text-decoration","text-transform","text-shadow","user-select","white-space","width","z-index"]});function kt(e){return Ln[e]||e}function wr(e,t,r){return(e?";":"")+(Ie?t:Rn(t))+":"+r}function Rn(e){return ar[e]||(ar[e]=Zn(kt(e)))}function $n(e){return Ee?e:e.replace(/,\s*[:[]?/g,t=>yr(t.charCodeAt(t.length-1))?",&"+ze(t):",& ")}function Ue(e,t){if(pr&&(I&&ke.head&&ke.head.appendChild(I),pr=!1),I&&I.sheet)try{I.sheet.insertRule(e,t??I.sheet.cssRules.length)}catch(r){console.error("Insert rule error:",r,e)}}function Lt([e,...t],r,n=0,o=!1){if(I||vt(),ht.has(e))return{...ht.get(e),parent:r,args:t};Ee=o;let i={};J=[],D="&&",yt=ve=fe=M=N=P="",B.length=q=0,re=k=mt=Ke=te=-1,H=Ee?{}:null,Ct=!1,wt=!1,dt=!0,v=e[0];for(let a=0;a<e.length;a++)if(H?Cr(0,a===e.length-1):Bn(e,a),v=e[a+1],a<t.length){let l=e[a].slice(k),g=t[a];if(w.isServer&&S(g)&&!V(g)&&(g="6invalidate"),ur&&k>=0&&g!=="6invalidate")F=pt+Math.abs(q).toString(31),i[dr="--"+F+a]={property:P,fns:J.slice(-1),unit:St(P,ze(J)),index:a},N+=l+"var("+dr+")",k=0;else{let h=l+g+St(P,ze(J));N+=h;for(let f=0;f<h.length;f++)q=Math.imul(31,q)+h.charCodeAt(f)|0;dt=!1,k=ur?-1:0}}Ct&&(Ee?Object.entries(H).forEach(([a,l])=>{Ue(a.replace(/&\s+/g,"").replace(/{&$/,"")+"{"+l+"}")}):(F=pt+Math.abs(q).toString(31),fe+=(fe?" ":"")+F,hr=n&&"&".repeat(n+1),cr.has(F)||Object.entries(H).forEach(([a,l])=>{hr&&(a=a.replace("&","&".repeat(n+1))),Ue(a.replace(/&/g,"."+F)+"{"+l+"}")})));let s={name:yt,classes:fe,id:ve,args:t,vars:i,parent:r};return dt?ht.set(e,s):cr.add(F),s}function Bn(e,t){for(let r=0;r<=v.length;r++)if(y=v.charCodeAt(r),r<v.length&&(q=Math.imul(31,q)+y|0),wt){if(gt(y)){H={},Cr(r++,t===e.length-1);break}}else!gt(y)||r===v.length?(fe=(K!==-1?v.slice(K+1,r).replace(/\./g," "):"")+fe,ve===""&&(ve=Ce!==-1?v.slice(Ce,K===-1?r:K):""),yt=v.slice(0,ve?Ce-1:K!==-1?K:r),Ce=K=-1,wt=!0):y===35?Ce=r+1:K===-1&&y===46&&(K=r)}function Fn(e){return gr[e]||e}function Cr(e,t){for(let r=e;r<=v.length;r++)y=v.charCodeAt(r),r<v.length&&(q=Math.imul(31,q)+y|0),ue===-1&&k!==-1&&(Ie?jn(y):Vn(y)||t&&r===v.length)&&qn(r),ue!==-1?ue===y&&v.charCodeAt(r-1)!==92&&(ue=-1):ue===-1&&Hn(y)?(ue=y,k===-1&&(k=r)):y===123?zn(r):y===125||t&&r===v.length?Kn():r!==v.length&&U===-1&&gt(y)?(U=r,Ke=y):!P&&U>=0&&fr(y)?(P=v.slice(U,r),Ie=y===58):k===-1&&P&&!fr(y)?(k=re=r,br(y)?de=r:y===36&&(te=r)):k!==-1?vr(r):(y===9||y===32)&&(re=r+1)}function qn(e){Sr(e),P==="@import"?Ue(P+" "+v.slice(k,e)+";",0):M+=wr(M,P,N+v.slice(k,e)),Ct=!0,U=k=-1,Ie=!1,P=N=""}function Sr(e){de!==-1?Un(e):te!==-1&&In(e)}function zn(e){P==="animation"?(M&&(H[D]=M),Se=N+v.slice(k,e).trim(),bt=N="",M=""):Se?(Fe=v.slice(U,e).trim(),M=""):(M&&(H[D]=M),ee=(Ke===64?Fn(P)+(N||"")+v.slice(k-1,e):v.slice(U,e)).trim(),ee.indexOf(",")!==-1&&(ee=$n(ee)),N=P="",B.push((yr(Ke)?"":" ")+ee+(ee==="@font-face"&&++mt?"/*"+Array(mt).join(" ")+"*/":"")),D=Er(B),M=H[D]||""),U=k=-1,P=""}function Kn(){if(Fe)bt+=Fe+"{"+M+"}",Fe=M="";else if(Se)M=H[D]||"",F=pt+Math.abs(q).toString(31),Ue("@keyframes "+F+"{"+bt+"}"),M+=wr(M,"animation",Se+" "+F),Se="";else{let e=B.map(t=>t.charCodeAt(0)===64&&mr(t)?"}":"").join("");B.pop(),B.length&&B[0].indexOf("@keyframes")===0?H[B[0]]=(H[B[0]]||"")+ee+"{"+M+"}":M&&(H[D]=M.trim()+e),D=Er(B),M=H[D]||""}U=k=-1,P=""}function vr(e){br(y)?de===-1&&(de=e):Sr(e),y===40?J.push(v.slice(Math.max(re,k),e)):y===41?J.pop():y===9||y===32?re=e+1:y===36&&(te=e)}function In(e){Pn(y)||(N=N+v.slice(k,te)+"var(--"+v.slice(te+1,e)+")",k=e,te=-1)}function Un(e){!Nn(y)&&v.charCodeAt(re)!==35&&(N=N+v.slice(k,e)+St(P,ze(J)),k=e),de=-1}function St(e,t=""){e=kt(e);let r=e+","+t;return C.call(ft,r)?ft[r]:ft[r]=t&&Mn(t)?"px":Tn(t)?"deg":t?"":Dn(e)}function De(e,{property:t,fns:r,unit:n}){if(S(e)&&(e=e()),!e&&e!==0)return"";if(typeof e=="number")return e+n;if(typeof e!="string"&&(e=""+e),e.charCodeAt(0)===36)return"var(--"+e.slice(1)+")";v=e,N="",k=0,de=re=-1,P=t,J=r;for(let o=0;o<=e.length;o++)y=e.charCodeAt(o),vr(o);return N+e.slice(k)}function Er(e){if(e.length===0)return"&&";let t=0;return e.reduce((r,n,o,i)=>{let s=n.charCodeAt(0);return s===64&&(n.indexOf("@font-face")===0&&o++,mr(n))?(t++,n+"{"+(o===i.length-1?"&&":"")+r):r+(Ee||o-t?"":s===32?"&":"&&")+n},"")}function Dn(e){if(e=kt(e),st(e)||C.call(Be,e))return Be[e];try{return he.style[e]="1px",he.style.setProperty(e,"1px"),Be[e]=he.style[e].slice(-3)==="1px"?"px":""}catch{return Be[e]=""}}function Zn(e){if(qe.indexOf(e)===-1){if(lr[e])return lr[e];e.indexOf("--")!==0&&w.sinHMR&&w.console.error(e,"css property not found")}return e}var I,pt,ke,kn,he,gr,ar,ft,vt,Et,Be,qe,Ln,lr,ht,cr,ur,An,On,mr,Mn,Tn,gt,br,Pn,Nn,Hn,fr,Vn,yr,jn,ze,B,U,k,K,Ce,Ke,ue,y,re,de,mt,te,F,P,D,ee,Se,hr,Fe,M,bt,yt,ve,fe,v,N,dr,H,pr,Ie,wt,dt,Ct,q,Ee,J,kr=T(()=>{x();ae();sr();pt="s",ke=w.document,kn=/^(ms|moz|webkit)[-A-Z]/i,he=ke.createElement("div"),gr={},ar={},ft={},vt=e=>I||(I=e||ke.querySelector("style.sin")||ke.createElement("style")),Et=(e,t)=>typeof t=="string"?gr["@"+e]=t:Object.entries(e).forEach(([r,n])=>Et(r,n)),Be={flex:"",border:"px","line-height":"","box-shadow":"px","border-top":"px","border-left":"px","border-right":"px","border-bottom":"px","text-shadow":"px","@media":"px"},qe=Array.from(Object.keys(C.call(he.style,"width")?he.style:Object.getPrototypeOf(he.style)).reduce((e,t)=>(e.add(t.match(kn)?"-"+Ve(t):Ve(t)),e),new Set(["float"]))),Ln=Object.assign(qe.reduce(ut,{}),ir.reduce(ut,{})),lr=qe.reduce((e,t)=>{let r=t.match(/-(ms|o|webkit|moz)-/g);if(r){let n=t.replace(/-(ms|o|webkit|moz)-/,"");qe.indexOf(n)===-1&&(n==="flexDirection"&&(e.flex="-"+r[1].toLowerCase()+"-flex"),e[n]=t)}return e},{}),ht=new Map,cr=new Set,ur=w.CSS&&w.CSS.supports("color","var(--support-test)"),An=["perspective","blur","drop-shadow","inset","polygon","minmax"],On=["@media","@supports","@document","@layer"],mr=e=>On.some(t=>e.indexOf(t)===0),Mn=e=>e.indexOf("translate")===0||An.indexOf(e)>-1,Tn=e=>e.indexOf("rotate")===0||e.indexOf("skew")===0,gt=e=>e!==32&&e!==9&&e!==10&&e!==13&&e!==59,br=e=>e>=48&&e<=57||e===46,Pn=e=>e>=65&&e<=90||e>=97&&e<=122,Nn=e=>e===37||e>=65&&e<=90||e>=97&&e<=122,Hn=e=>e===34||e===39,fr=e=>e===32||e===58||e===9,Vn=e=>e===59||e===10||e===125,yr=e=>e===38||e===58||e===64||e===91,jn=e=>e===59||e===125,ze=e=>e[e.length-1],B=[],U=-1,k=-1,K=-1,Ce=-1,Ke=-1,ue=-1,y=-1,re=-1,de=-1,mt=-1,te=-1,F="",P="",D="&&",ee="",Se="",hr="",Fe="",M="",bt="",yt="",ve="",fe="",v="",N="",dr="",H=null,pr=!0,Ie=!1,wt=!1,dt=!0,Ct=!1,q=0,Ee=!1,J=[]});function c(...e){let t=typeof e[0];return t==="string"?Rt(Object.assign([e[0]],{raw:[]}))(...e.slice(1)):Rr(Rt,it(e[0])?jr(e):t==="function"?new j(c.redrawing,e):new j(c.redrawing,[e[1],e[0]]))}function Rt(...e){return it(e[0])?Rr(Rt,jr(e,this)):Qn(e,this)}function jr(e,t){let r=t?t.level+1:0;return new j(t&&t.inline,t&&t.component,Lt(e,t&&t.tag,r),r)}function Rr(e,t){let r=e.bind(t);return r[Ne]=!0,r}function Xn(e){let t=new Set(e?[e]:[]);return r.observe=n=>(t.add(n),()=>t.delete(n)),r;function r(...n){[...t].forEach(o=>o(...n))}}function Yn(e,...t){return Wn({key:""+e,strings:e,values:t})}function Gn(e,t,r,n){return typeof n=="function"&&([r,n]=[n,r]),(...o)=>{let i=s=>zt(r,s,...o);return e.addEventListener(t,i,n),()=>e.removeEventListener(t,i,n)}}function Jn(e){return e.setAttribute("animate","entry"),requestAnimationFrame(()=>e.removeAttribute("animate")),r=>r&&new Promise(n=>{let o=!1;e.addEventListener("transitionrun",()=>(o=!0,t(n)),{once:!0,passive:!0}),e.setAttribute("animate","exit"),requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>o||n())))});function t(r){e.addEventListener("transitionend",r,{once:!0,passive:!0}),e.addEventListener("transitioncancel",r,{once:!0,passive:!0})}}function _n(e,t){e.addEventListener("click",r=>{if(!r.defaultPrevented&&(r.button===0||r.which===0||r.which===1)&&(!r.currentTarget.target||r.currentTarget.target==="_self")&&!r.ctrlKey&&!r.metaKey&&!r.shiftKey&&!r.altKey){r.preventDefault();let n=e[Ge].state;t(e.getAttribute("href"),{state:n})}})}function Qn(e,t){let r=$r(e&&e[0]);return new j(t.inline,t.component,t.tag,t?t.level+1:0,r?e.shift():{},e.length===1&&Array.isArray(e[0])?e[0]:e)}function $r(e){return e!==null&&typeof e=="object"&&!(e instanceof j)&&!Array.isArray(e)&&!(e instanceof Date)&&!(e instanceof w.Node)&&!S(e.then)}function xn(e,t,r={},n={}){if(S(t)){if(!e)throw new Error("The dom element you tried to mount to does not exist.")}else if(n=r||{},r=t||{},t=e,e=E.body,!e)throw new Error("document.body does not exist.");if(!(t instanceof j)&&(t=c(t)),C.call(n,"location")||(n.location=w.location),C.call(n,"error")||(n.error=c.error),c.isServer)return{view:t,attrs:r,context:n};e[G]=new Error().stack,c.scroll&&eo(n),n.hydrating=ro(e.firstChild);let o={head:n.hydrating?se:Br,lang:c.live(E.documentElement.lang,i=>E.documentElement.lang=i),title:c.live(E.title,i=>E.title=i),status:se,headers:se};n.doc=o,n.route=we(c,"",{doc:n.doc,location:n.location,query:c.route.query}),Pr.set(e,{view:t,attrs:r,context:n}),Fr({view:t,attrs:r,context:n},e)}function eo(e){let t=0;e[Nt]=o=>t!==-1&&(t+=o)||(t=-1,$e(0,0)),w.history.scrollRestoration="manual",ye(...history.state?.scroll||[]);let r;setTimeout(()=>{E.addEventListener("scroll",n,{passive:!0}),E.addEventListener("resize",n,{passive:!0}),t===0&&(t=-1,$e(0,0))},200);function n(){clearTimeout(r),r=setTimeout(to,100)}}function to(){w.history.replaceState({...history.state,scroll:[E.documentElement.scrollLeft||E.body.scrollLeft,E.documentElement.scrollTop||E.body.scrollTop,E.documentElement.scrollWidth,E.documentElement.scrollHeight]},null,location.pathname+location.search+location.hash)}function Br(e){if(Array.isArray(e))return e.forEach(Br);let t=E.createElement($(e.tag));for(let r in e.attrs)t.setAttribute(r,e.attrs[r]);e.children.length&&(t.innerHTML=e.children[0]),E.head.appendChild(t)}function ro(e){let t=e&&e.nodeType===8&&e.data==="h"&&(e.remove(),!0);if(t){let r,n=[],o=E.createTreeWalker(E.body,NodeFilter.SHOW_COMMENT);for(;r=o.nextNode();)r.data===","&&n.push(r);n.forEach(i=>i.remove())}return t}function Me(){return Xe||(w.requestAnimationFrame(no),Xe=c.isServer?rt:new Promise(e=>Vr=e)),Xe}function no(){Xe=null,Pr.forEach(Fr),Vr()}function Fr(e,t){c.redrawing=!0;try{e.doms=Te(t,je(e.view(e.attrs)),e.context,e.doms&&e.doms.dom.previousSibling,e.doms&&e.doms.last)}catch(r){e.attrs.error=r,e.doms=Te(t,je(e.context.error(r,e.attrs,[],e.context)),e.context,e.doms&&e.doms.dom.previousSibling,e.doms&&e.doms.last)}c.redrawing=!1,qt()}function qt(){Je.forEach(e=>e()),Je=[]}function Te(e,t,r,n,o=e.lastChild){let i=t[0]&&t[0].key!==void 0&&new Array(t.length),s=Or(n,e),a=s&&C.call(s,z),l=o?o.nextSibling:null;i&&(i.rev=new Map)&&a?oo(e,r,s[z],t,i,l,s):qr(e,r,t,i,s,l);let g=Or(n,e);return i&&(g[z]=i),W(g,l&&l.previousSibling||e.lastChild)}function Or(e,t){let r=e?e.nextSibling:t.firstChild;for(;Ye.has(r);)r=r.nextSibling;return r}function Le(e,t,r,n){e[n]={dom:t,key:r},t[z]=e,t[Nr]=n,e.rev.set(r,n)}function qr(e,t,r,n,o,i=null){let s=0,a,l;for(;s<r.length;)(o===null||!Ye.has(o))&&(l=r[s],a=o!==i?Z(o,l,t,e):Z(null,l,t),o===i&&e.insertBefore(a.dom,i),n&&Le(n,a.first,l.key,s),o=a.last,s++),o!==null&&(o=o.nextSibling);for(;o&&o!==i;)o=ne(o,e)}function oo(e,t,r,n,o,i,s){let a=r.rev,l=new Set;for(let p of n){if(p.key===void 0)return qr(e,t,n,o,s,i);l.add(p.key)}let g=r.length-1,h=n.length-1,f=r[g],u=n[h],b=-1;e:for(;;){for(;f&&!l.has(f.key);)ne(f.dom,e),a.delete(f.key),f=r[--g];for(;f&&f.key===u.key;){if(i=Z(f.dom,u,t,e).first,Le(o,i,u.key,h),a.delete(u.key),h===0)break e;if(g===0){u=n[--h];break}f=r[--g],u=n[--h]}if(a.has(u.key)){if(b=a.get(u.key),b>h)b=Z(r[b].dom,u,t,e),Ot(e,b,i),i=b.first,Le(o,i,u.key,h);else if(b!==h)b=Z(r[b].dom,u,t,e),Ot(e,b,i),i=b.first,Le(o,i,u.key,h);else{f=r[--g];continue}if(a.delete(u.key),h===0)break;u=n[--h]}else{if(b=Z(null,u,t),Ot(e,b,i),i=b.first,Le(o,i,u.key,h),h===0)break;u=n[--h]}}a.forEach((p,A)=>ne(r[p].dom,e))}function Ot(e,{first:t,last:r},n){let o=t,i;do i=o,o=i.nextSibling;while(e.insertBefore(i,n)!==r)}function Z(e,t,r,n,o,i){return V(t)?so(e,t,r,n,o,i):S(t)?Z(e,t(),r,n,o,i):t instanceof j?Mr(e,t,r,n,o,i):t instanceof Promise?Mr(e,c(()=>t)(),r,n,o,i):Array.isArray(t)?Kr(e,t,r,n,i):t instanceof Node?io(e,t,r):Ir(e,t,n,i)}function io(e,t,r){return e&&r.hydrating?W(e):W(t)}function Mr(e,t,r,n,o,i){return t.component?Ur(e,t,r,n,o,i):lo(e,t,r,n,i)}function so(e,t,r,n){if(e&&C.call(e,At)&&e[At].view===t)return i(t());let o=i(t());return Pe(e,t,i),o;function i(s){let a=Z(e,s,r,n||e&&e.parentNode);return qt(),e!==a.first&&Pe(a.first,t,i),e=a.first,a.first[At]={view:t,doms:a},a}}function W(e,t=e,r=t){return{dom:e,first:t,last:r}}function ao(e){if(!e||e.nodeType!==8||e.data.charCodeAt(0)!==91)return;let t=parseInt(e.data.slice(1)),r=e,n;for(;t&&r.nextSibling;)r=r.nextSibling,r.nodeType===8?(n=r.data.charCodeAt(0),t+=n===91?parseInt(r.data.slice(1))-1:n===97?1:-1):t--;return _e(e,r),r}function _e(e,t){(t||e)[jt]=e,e[Vt]=t}function zr(e){return e&&C.call(e,Vt)?e[Vt]:ao(e)}function Kr(e,t,r,n,o){o&&e&&n&&(e=Kr(e,[],r,n).first);let i=zr(e)||e,s=Ir(e,"["+t.length,n,!1,8);if(n){let a=i?i.nextSibling:null;Te(n,t,r,s.first,i);let l=a?a.previousSibling:n.lastChild;return i!==l&&_e(s.first,l),W(s.dom,s.first,l)}return n=new DocumentFragment,n.appendChild(s.dom),Te(n,t,r,s.first,i),_e(s.first,n.lastChild),W(n,s.first,n.lastChild)}function Ir(e,t,r,n,o=typeof t=="boolean"||t==null?8:3){let i=n||!e||e.nodeType!==o;return i&&Xr(e,e=o===8?E.createComment(t):E.createTextNode(t),r),!i&&e.data!==""+t&&(e.data=t),W(e)}function lo(e,t,r,n,o=e===null||uo(e,t,r)){let i=r.NS;t.attrs.xmlns||Lr[$(t.tag)]&&(r.NS=t.attrs.xmlns||Lr[$(t.tag)]),o&&Xr(e,e=fo(t,r),n);let s=t.children&&t.children.length;return go(e,t,r,o),s?Te(e,t.children,r):e[Ar]&&co(e.firstChild,e),e[Ar]=s,r.NS=i,C.call(t,"key")&&(e[Hr]=t.key),W(e)}function co(e,t){for(;e;)e=ne(e,t)}function uo(e,t,r){return e[Hr]!==t.key&&!r.hydrating||e.nodeName.toLowerCase()!==($(t.tag).toLowerCase()||"div")}function fo(e,t){let r=e.attrs.is;return t.NS?r?E.createElementNS(t.NS,$(e.tag),{is:r}):E.createElementNS(t.NS,$(e.tag)):r?E.createElement($(e.tag)||"div",{is:r}):E.createElement($(e.tag)||"div")}function Ze(e,t){e.onremoves?e.onremoves.add(t):e.onremoves=new Set([t])}function ho(e){let t="/"+e.data,r=e.nextSibling;for(;r&&(r.nodeType!==8||r.data!==t);)r=r.nextSibling;let n=W(e.nextSibling,e.nextSibling,r.previousSibling);if(C.call(r,jt)&&_e(r[jt],r.previousSibling),C.call(e,_)&&(n.first[_]=e[_]),C.call(e,z)){let o=e[z];n.first[z]=o,o[e[Nr]].dom=n.first}return e.remove(),r.remove(),n}function po(e){let t="/"+e.data,r=e.nextSibling;for(;r&&(r.nodeType!==8||r.data!==t);)r=r.nextSibling;return W(e,e,r)}function Ur(e,t,r,n,o=e&&e[_]||new Bt,i=o.changed(t,r),s=!1,a=!1){let l=i?o.add(t,r,s):o.next();if(!i&&l.ignore&&!a)return o.pop(),o.dom;t.key!==void 0&&(i||r.hydrating)&&(l.key=t.key);let g=l.promise&&e&&e.nodeType===8&&e.data.charCodeAt(0)===97;if(g)l.next=po(e);else{let u=Dr(i,l,t);u&&C.call(u,Ne)&&(u=u(t.attrs,t.children,l.context)),l.next=Z(e,!l.caught&&!l.promise&&u instanceof j?Jt(u,t):u,l.context,n,o,(i||l.recreate)&&!l.hydrating?!0:void 0),l.hydrating&&(l.hydrating=l.context.hydrating=!1),l.recreate&&(l.recreate=!1)}let h=o.i-1;i&&l.promise&&(r[Nt](1),l.promise.then(u=>l.view=u&&C.call(u,"default")?u.default:u).catch(u=>{l.caught=u,l.view=Zr(l,t,u)}).then(()=>C.call(l.next.first,_)&&o.xs[h]===l&&(g&&(o.dom=ho(e)),r.hydrating=!1,l.recreate=!0,l.promise=!1,(l.ignore?l.context.redraw():Me()).then(()=>r[Nt](-1)))));let f=e!==l.next.first;return o.pop()&&(f||i)&&(o.dom=l.next,l.next.first[_]=o),l.next}function Dr(e,t,r){try{return t.stateful||e?S(t.view)&&!t.view[Ne]?t.view(r.attrs,r.children,t.context):t.view:r.component[0](r.attrs,r.children,t.context)}catch(n){return Zr(t,r,n)}}function Zr(e,t,r){return C.call(e.error,Ne)?e.error().component[0](r,t.attrs,t.children,e.context):e.error(r,t.attrs,t.children,e.context)}function go(e,t,r){let n=t.tag,o,i=e[Ge]||r.hydrating&&mo(e),s=!i;if(C.call(t.attrs,"id")===!1){let l=Yt(t.tag);l&&(t.attrs.id=l)}Mt(e,t),s&&Pe(e,t.attrs.class,()=>Mt(e,t)),s&&Pe(e,t.attrs.className,()=>Mt(e,t)),t.attrs.type!=null&&Qe(e,"type",t.attrs.type);for(let l in t.attrs)if(at(l))l==="deferrable"&&(e[Pt]=t.attrs[l]);else if(l==="value"&&$(n)==="input"&&e.value!==""+t.attrs[l]){let g,h;e===E.activeElement&&(g=e.selectionStart,h=e.selectionEnd),Tt(e,t.attrs,l,e.value,t.attrs[l],s),e===E.activeElement&&(e.selectionStart!==g||e.selectionEnd!==h)&&e.setSelectionRange(g,h)}else(!i||i[l]!==t.attrs[l])&&Tt(e,t.attrs,l,i&&i[l],t.attrs[l],s);if(C.call(t.attrs,"href")&&(r.hydrating||!i||i.href!==t.attrs.href)){o=t.attrs.href;let l=!String(o).match(/^[a-z]+:|\/\//);l&&(o=be(t.attrs.href)),Tt(e,t.attrs,"href",i&&i.href,o,s),o&&l&&(t.attrs.href=c.pathmode+o,_n(e,r.route))}if(i)for(let l in i)C.call(t.attrs,l)===!1&&(ot(l)?Wr(e,l):at(l)?l==="deferrable"&&(e[Pt]=!1):e.removeAttribute(l));let a=bo(e,t.attrs.style,i&&i.style);if(n)for(Tr(e,n.vars,n.args,s||r.hydrating,a);n=n.parent;)Tr(e,n.vars,n.args,s||r.hydrating,a);(s||r.hydrating)&&t.attrs.dom&&yo(e,t.attrs,t.children,r,t.attrs.dom),C.call(t,G)&&(e[G]=t[G]),e[Ge]=t.attrs}function mo(e){if(!e||!e.hasAttributes())return;let t={};for(let r of e.attributes)t[r.name]=r.value||!0;return t}function bo(e,t,r){if(r!==t){if(t==null)return e.style.cssText="",!0;if(typeof t!="object")return e.style.cssText=t,!0;if(r==null||typeof r!="object"){e.style.cssText="";for(let n in t){let o=t[n];o!=null&&e.style.setProperty(Re(n),o+"")}return!0}for(let n in t){let o=t[n];o!=null&&(o=o+"")!=r[n]+""&&e.style.setProperty(Re(n),o)}for(let n in r)r[n]!=null&&t[n]==null&&e.style.removeProperty(Re(n));return!0}}function Pe(e,t,r){if(!V(t))return;let n=C.call(e,Ae),o=n?e[Ae]:new Set;n||(e[Ae]=o),o.add(t.observe(r))}function Mt(e,t){let r=Gt(t);e.className!=r&&(r?e instanceof SVGElement?e.setAttribute("class",r):e.className=r:e.removeAttribute("class"))}function Tr(e,t,r,n,o){for(let i in t){let s=t[i],a=r[s.index];Ft(e,i,a,s,n,o)}}function Ft(e,t,r,n,o,i,s){if(V(r)){o&&r.observe(a=>e.style.setProperty(t,De(a,n))),(o||i)&&Ft(e,t,r(),n,o,o);return}if(S(r))return rt.then(()=>Ft(e,t,r(e),n,o,i,s));e.style.setProperty(t,De(r,n)),s&&Je.push(()=>e.style.setProperty(t,De(r,n)))}function yo(e,t,r,n,o){Je.push(()=>{je(o).forEach(async i=>{let s=S(i)&&i(e,t,r,n);s&&S(s.then)&&(s=await s,Me()),S(s)&&(C.call(e,Oe)?e[Oe].push(s):e[Oe]=[s])},[])})}function Tt(e,t,r,n,o,i){if(n===o)return;let s=ot(r);s&&typeof n==typeof o||(s?o?Co(e,t,r):Wr(e,r):(Qe(e,r,o),i&&Pe(e,o,a=>Qe(e,r,a))))}function Qe(e,t,r){if(r==null&&(r=""),S(r))return Qe(e,t,r());wo(e,t)?e[t]=r:!r&&r!==0?e.removeAttribute(t):e.setAttribute(t,r===!0?"":r)}function wo(e,t){return!(e instanceof SVGElement)&&t!=="href"&&t!=="list"&&t!=="form"&&t!=="tabIndex"&&t!=="download"&&t!=="width"&&t!=="height"&&t in e}function Wr(e,t){e.removeEventListener(t.slice(2),e[Ht])}function Co(e,t,r){e.addEventListener(r.slice(2),e[Ht]||(e[Ht]=So(e)))}function So(e){return{handleEvent:t=>zt(e[Ge]["on"+t.type],t,e)}}function zt(e,t,...r){if(Array.isArray(e))return e.forEach(o=>zt(o,t,...r));let n=S(e)?e.call(t.currentTarget,t,...r):S(e.handleEvent)&&e.handleEvent(t,...r);if(t.redraw===!1){delete t.redraw;return}!V(n)&&!V(e)&&Me(),n&&S(n.then)&&n.then(Me)}function Xr(e,t,r){if(r)return e&&(r.insertBefore(t,e),ne(e,r)),t}function vo(e,t,r,n,o){let i=zr(e);if(!i||e===i)return e.nextSibling;let s=i.nextSibling;if(e=e.nextSibling,!e)return s;do e=ne(e,t,r,n,o);while(e&&e!==s);return s}function We(e,t){let r=C.call(t,_)&&t[_];r&&r.i<=r.top&&(r.i?r.xs.slice(r.i):r.xs).forEach(n=>n.onremoves&&n.onremoves.forEach(o=>o())),C.call(t,Ae)&&t[Ae].forEach(n=>n()),e.removeChild(t)}function ne(e,t,r=!0,n=[],o=!1){let i=e.nextSibling;if(Ye.has(e))return i;if(e.nodeType===8)if(e.data.charCodeAt(0)===97){if(i=e.nextSibling,We(t,e),!i)return i;e=i,i=e.nextSibling}else e.data.charCodeAt(0)===91&&(i=vo(e,t,r,n,o));if(e.nodeType!==1)return r&&We(t,e),i;if(C.call(e,Oe))for(let a of e[Oe])try{let l=a(o||r);(o||r)&&l&&S(l.then)&&n.push(l)}catch(l){console.error(l)}!o&&(o=e[Pt]||!1);let s=e.firstChild;for(;s;)ne(s,e,!1,n,o),s=s.nextSibling;return r&&(n.length===0?We(t,e):(Ye.add(e),Promise.allSettled(n).then(()=>We(t,e)))),i}function Eo(){c.css`
    *,*::before,*::after{box-sizing border-box}
    input,button,textarea,select{font inherit;tt none}
    *{m 0;p 0;overflow-wrap break-word;hyphens auto}
    body{ff system-ui, sans-serif}
    body{lh calc(1em + .42rem)}
    img,svg,video,canvas,audio,iframe,embed,object{d block;va middle}
    img,video{max-width 100%;h auto}
    ol,ul{list-style none}
    body{min-height 100svh}
    body{-webkit-font-smoothing: antialiased;text-rendering: optimizeLegibility;}
`,c.css`
    img,video{background-repeat no-repeat;background-size cover;object-size cover;shape-margin 0.75rem}
    button,[type='button'],[type='reset'],[type='submit']{-webkit-appearance button;bc transparent;bi none}
    button,input,optgroup,select,textarea{c inherit}
    :target{scroll-margin-block 5ex}
  `}var E,Lr,Ye,Pr,Pt,Ae,_,Nt,Ht,Vt,jt,At,Ar,Oe,Ge,Nr,z,Hr,Ne,Je,Xe,Vr,Wn,$t,Bt,pe=T(()=>{_t();Qt();xt();x();nr();or();kr();ae();E=w.document,Lr={svg:"http://www.w3.org/2000/svg",math:"http://www.w3.org/1998/Math/MathML"},Ye=new WeakSet,Pr=new Map,Pt=Symbol("deferrable"),Ae=Symbol("observable"),_=Symbol("component"),Nt=Symbol("cycle"),Ht=Symbol("event"),Vt=Symbol("arrayEnd"),jt=Symbol("arrayStart"),At=Symbol("live"),Ar=Symbol("size"),Oe=Symbol("life"),Ge=Symbol("attr"),Nr=Symbol("keyIndex"),z=Symbol("keys"),Hr=Symbol("key"),Ne=Symbol("s"),Je=[];c.redrawing=!1;c.sleep=(e,...t)=>new Promise(r=>setTimeout(r,e,...t));c.with=(e,t)=>e===void 0?e:t(e);c.isAttrs=$r;c.isServer=!1;c.pathmode="";c.redraw=Me;c.mount=xn;c.css=(...e)=>Lt(e,null,0,!0);c.css.alias=Et;c.css.reset=Eo;c.style=vt;c.animate=Jn;c.http=le;c.live=ce;c.event=Xn;c.on=Gn;c.trust=Yn;c.route=we(c,"",{location:w.location,query:ct(c,w.location)});c.window=w;c.scroll=!0;c.error=c(e=>(console.error(e),()=>c`pre;all initial;d block;c white;bc #ff0033;p 8 12;br 6;overflow auto;fs 12`(c`code`("Unexpected Error: "+(e.message||e)))));Wn=c(({strings:e,values:t=[]})=>{let r=E.createElement("div"),n=Array.isArray(e.raw)?[...e.raw]:[e.trim()];n[0]=n[0].trimStart(),n[n.length-1]=n[n.length-1].trimEnd(),r.innerHTML=String.raw({raw:n},...t);let o=[...r.childNodes,E.createComment("trust")];return()=>o});$t=class{constructor(t,r,n,o,i){this.init=t,this.key=void 0,this.view=r,this.error=n,this.caught=void 0,this.loading=o,this.hydrating=i,this.onremoves=void 0,this.promise=void 0,this.stateful=void 0,this.next=void 0,this.ignore=!1,this.context=void 0,this.recreate=!1}},Bt=class{constructor(){this.xs=[],this.i=0,this.top=0,this.dom=null}changed(t,r){if(this.i>=this.xs.length)return!0;let n=this.xs[this.i],o=n.key!==t.key&&!r.hydrating||n.init&&n.init!==t.component[0];return o&&n.onremoves&&n.onremoves.forEach(i=>i()),o}add(t,r,n){let[o,i]=t.component,s=new $t(t.inline?!1:o,o,i&&i.error||r.error,i&&i.loading||r.loading,r.hydrating),a=(u,b,p)=>{u instanceof Event&&(u.redraw=!1);let A=this.dom.first[z];Ur(this.dom.first,t,r,this.dom.first.parentNode,this,b,p,!0),C.call(this.dom.first,z)||(this.dom.first[z]=A),A&&A.rev.has(t.key)&&(A[A.rev.get(t.key)].dom=this.dom.first),qt()},l=async u=>{a(u,!1,!0,!0)},g=u=>{s.onremoves&&(s.onremoves.forEach(b=>b()),s.onremoves=void 0),a(u,!0)},h=u=>{s.onremoves&&(s.onremoves.forEach(b=>b()),s.onremoves=void 0),a(u,!0,!0)};s.context=Object.create(r,{hydrating:{value:r.hydrating,writable:!0},onremove:{value:u=>{Ze(s,u)}},ignore:{value:u=>{s.ignore=u}},refresh:{value:h},redraw:{value:l},reload:{value:g}});let f=Dr(!0,s,t);return V(t.attrs.reload)&&Ze(s,t.attrs.reload.observe(g)),V(t.attrs.redraw)&&Ze(s,t.attrs.redraw.observe(l)),V(t.attrs.refresh)&&Ze(s,t.attrs.refresh.observe(h)),s.promise=f&&S(f.then)&&f,s.stateful=s.promise||S(f)&&!f[Ne],s.view=n?this.xs[this.i].view:s.promise?s.loading:f,this.xs.length=this.top=this.i,this.xs[this.i++]=s}next(){return this.i<this.xs.length&&this.xs[this.top=this.i++]}pop(){return--this.i===0&&(this.xs.length=this.top+1,!(this.top=0))}}});function _r(){oe=new WebSocket(location.protocol.replace("http","ws")+location.hostname+":"+window.sindev.getAttribute("port")),oe.onmessage=ko,oe.onclose=()=>setTimeout(_r,200),oe.onerror=e=>Gr&&console.error(e)}function Yr(e,t){oe&&oe.readyState===1&&oe.send(JSON.stringify({event:e,data:t}))}function ko(e){let{event:t,data:r}=JSON.parse(e.data);Jr[t](r)}function Lo(e){return String(e).split(`
`).reduce((t,r)=>(r=r.endsWith(")")?r.match(/( +at )?([^/]*)[@(](.+):([0-9]+):([0-9]+)/i):r.match(/( +at)( )?(.+):([0-9]+):([0-9]+)$/i),r&&(Gr||!r[3].includes("/sin/src"))&&t.push({name:r[2].trim(),file:r[3].replace(window.location.origin,""),line:parseInt(r[4]),column:parseInt(r[5])}),t),[])}var oe,Gr,Jr,L,ge=T(()=>{pe();_r();Gr=window.sindev.hasAttribute("debug"),Jr={log:c.event(),redraw:c.event(),reload:c.event(()=>location.reload()),editor:c.event(e=>Yr("editor",e)),color:c.live([0,0,0]),inspect:c.live(!1,e=>Yr("inspect",e)),parseStackTrace:Lo},L=Jr});var Ao,Q,Oo,me,Qr,Mo,Kt=T(async()=>{ge();Ao="/node_modules/sin/src/index.js",Q=(await import(Ao)).default,Oo="/node_modules/sin/src/shared.js",{stackTrace:me}=await import(Oo),Qr=Q;L.redraw.observe(()=>window.hmr?Q.redraw():location.reload());Mo=navigator.platform.toLowerCase().includes("win")?/"([^<>:"/\\|?*]+)":/ig:/"([^\0/]+)":/ig;Q.error=Q(e=>{console.error(e);let t=L.parseStackTrace(e.stack||""),r=typeof e=="object"&&JSON.stringify(e,null,2).replace(Mo,"$1:");return()=>Q`pre
      all initial
      d block
      ws pre-wrap
      m 0
      c white
      bc #ff0033
      p 8 12
      br 6;
      overflow auto
    `(Q`code`(""+e,t.map(({name:n,file:o,line:i,column:s})=>Q`div
            c #ccc
          `("    at ",n&&n+" ",Q`span
              :hover { c white }
              td underline
              cursor pointer
            `({onclick:a=>{a.redraw=!1,L.editor({file:o,line:i,column:s})}},o+":"+i+":"+s))),r!=="{}"&&r))})});var To,xr,en,tn=T(()=>{pe();ge();To=!1,xr=!1,en=c(()=>[c`
    position fixed
    b 8
    l calc(50% - 26px)
    bc rgba(0 0 0/.05)
    backdrop-filter blur(8)
    p 4
    br 30
    d flex
    ai center
    c white
    pointer-events ${L.inspect.get(e=>e&&"none")}
    animation 1.5s {
      from {
        bc transparent
      }
    }
  `(c`
      w 44
      h 44
      br 22
      p 6
      bc rgb(30 30 30/65%)
      bi linear-gradient(-185deg, rgb(211 234 255/.15), rgb(100 180 255/.15) 15%, rgb(255 0 15/.15) 80%, rgb(255 150 0/.15))
      bs 0 1 12 -4 rgb(0 0 0/.35), 0 0 4 -1 rgb(0 0 0/.35)
      animation 0.5s {
        from {
          transform scale(0) rotate(-180)
          o 0
        }
        80% {
          transform scale(1.1)
        }
      }
    `({dom:e=>L.redraw.observe(()=>{e.animate([{transform:"rotate(0)"},{transform:"rotate(180deg) scale(1.1)"},{transform:"rotate(360deg)"}],{duration:300,easing:"ease-out"})})},c.trust`
        <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M279.285 28.0767C317.536 66.3278 317.536 128.345 279.285 166.596L246.57 199.311L198.3 151.041L189.727 159.615C170.2 179.141 170.2 210.799 189.726 230.326L202.641 243.24L155.765 290.116L136.688 271.039C98.4372 232.788 98.4373 170.771 136.688 132.52L260.208 9L279.285 28.0767ZM236.474 277.073L200.712 312.835C162.46 351.086 162.46 413.103 200.711 451.354L219.788 470.431L343.308 346.911C381.559 308.66 381.559 246.643 343.308 208.392L324.231 189.315L280.403 233.143L288.674 241.414C308.2 260.94 308.2 292.599 288.674 312.125L280.1 320.699L236.474 277.073Z" fill="white"/>
        </svg>
      `,xr&&c`
        position absolute
        t -94
        l -94
        w 240
        h 240
        br 120
        transition .3s transform, background-color 0.3s
        [animate] {
          transform scale(.65)
        }
      `({dom:c.animate,onmouseleave:()=>xr=!1,deferrable:!0},[c.trust`
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 19L10 10M10 10V16.75M10 10H16.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 1H11H13M17 1H17.3889V1C19.3832 1 21 2.61675 21 4.61111V4.61111V5M1 5V4.61111V4.61111C1 2.61675 2.61675 1 4.61111 1V1H5M1 9V11V13M1 17V17.3889V17.3889C1 19.3832 2.61675 21 4.61111 21V21H5M9 21H11H13M21 13V11V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `,2,c`
            d grid
            pi center
            w 100%
            h 100%
            transform rotate(${To?0:180})
          `(c.trust`
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M8.16103 1.63148C8.90972 1.25 9.88982 1.25 11.85 1.25H12.15C14.1102 1.25 15.0903 1.25 15.839 1.63148C16.4975 1.96703 17.033 2.50247 17.3685 3.16103C17.75 3.90972 17.75 4.88982 17.75 6.85V13.15C17.75 15.1102 17.75 16.0903 17.3685 16.839C17.033 17.4975 16.4975 18.033 15.839 18.3685C15.0903 18.75 14.1102 18.75 12.15 18.75H11.85C9.88982 18.75 8.90972 18.75 8.16103 18.3685C7.50247 18.033 6.96703 17.4975 6.63148 16.839C6.25 16.0903 6.25 15.1102 6.25 13.15V6.85C6.25 4.88982 6.25 3.90972 6.63148 3.16103C6.96703 2.50247 7.50247 1.96703 8.16103 1.63148ZM3 21.25C2.58579 21.25 2.25 21.5858 2.25 22C2.25 22.4142 2.58579 22.75 3 22.75H21C21.4142 22.75 21.75 22.4142 21.75 22C21.75 21.5858 21.4142 21.25 21 21.25H3Z" fill="currentColor"/>
              </svg>
            `),c.trust`
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M9.56825 1.26915C9.77009 1.42514 9.94817 1.655 10.3043 2.11473L10.7271 2.66048C11.0286 3.0497 11.5078 3.24996 12.0001 3.24996C12.4926 3.24996 12.9718 3.04967 13.2733 2.66039L13.696 2.11479C14.0521 1.65517 14.2301 1.42536 14.4319 1.2694C14.9303 0.884143 15.5812 0.756251 16.1883 0.924246C16.4341 0.992255 16.6859 1.13761 17.1894 1.42831L18.5627 2.22117C19.0644 2.51088 19.3153 2.65573 19.4967 2.83382C19.947 3.2761 20.1621 3.90501 20.077 4.53043C20.0427 4.78226 19.9331 5.05042 19.7138 5.58674L19.7138 5.58677L19.4524 6.22632C19.2658 6.68269 19.3316 7.19671 19.5785 7.62345C19.8251 8.04961 20.2388 8.36648 20.7267 8.43301L21.4105 8.52626C21.9851 8.60461 22.2724 8.64378 22.5078 8.74014C23.0917 8.97914 23.5285 9.47964 23.6865 10.0905C23.7501 10.3367 23.7501 10.6267 23.7501 11.2065V12.7934C23.7501 13.3733 23.7501 13.6632 23.6865 13.9095C23.5285 14.5203 23.0917 15.0208 22.5078 15.2598C22.2724 15.3561 21.9851 15.3953 21.4105 15.4737L21.4105 15.4737L20.7266 15.5669C20.2388 15.6335 19.8251 15.9503 19.5785 16.3765C19.3316 16.8032 19.2658 17.3172 19.4524 17.7735L19.7138 18.4131L19.7139 18.4131C19.9331 18.9494 20.0427 19.2176 20.077 19.4694C20.1621 20.0948 19.947 20.7237 19.4967 21.166C19.3154 21.3441 19.0645 21.489 18.5627 21.7787L18.5627 21.7787L17.1894 22.5716C16.6859 22.8622 16.4342 23.0076 16.1884 23.0756C15.5812 23.2436 14.9303 23.1157 14.4319 22.7304C14.2301 22.5745 14.0521 22.3447 13.6961 21.8851L13.2734 21.3396C12.9718 20.9503 12.4926 20.75 12.0001 20.75C11.5077 20.75 11.0286 20.9502 10.727 21.3395L10.3043 21.8852C9.94815 22.3449 9.77009 22.5747 9.56827 22.7307C9.06986 23.1159 8.41909 23.2438 7.81197 23.0758C7.56614 23.0078 7.31435 22.8624 6.81078 22.5717L6.81076 22.5717L5.43761 21.7789C4.93578 21.4891 4.68486 21.3443 4.50353 21.1662C4.05324 20.7239 3.83814 20.095 3.92325 19.4696C3.95752 19.2178 4.06716 18.9496 4.28643 18.4132L4.54789 17.7736C4.73446 17.3173 4.66867 16.8032 4.42174 16.3765C4.17514 15.9503 3.76144 15.6334 3.27358 15.5669L2.58972 15.4737C2.01515 15.3953 1.72787 15.3561 1.49247 15.2598C0.908589 15.0208 0.471711 14.5203 0.31379 13.9095C0.250122 13.6632 0.250122 13.3733 0.250122 12.7934V11.2065C0.250122 10.6267 0.250122 10.3367 0.313789 10.0905C0.47171 9.47964 0.908589 8.97914 1.49247 8.74014C1.72787 8.64378 2.01515 8.60461 2.58972 8.52626L3.27354 8.43301C3.76142 8.36648 4.17514 8.0496 4.42175 7.62341C4.66869 7.19666 4.73448 6.68261 4.54791 6.22621L4.28645 5.58665C4.06718 5.05026 3.95754 4.78206 3.92326 4.5302C3.83816 3.90481 4.05326 3.27595 4.50354 2.83368C4.68488 2.65557 4.9358 2.5107 5.43764 2.22096L6.81073 1.42821C7.31436 1.13744 7.56618 0.99205 7.81203 0.924039C8.41912 0.756102 9.06985 0.883976 9.56825 1.26915ZM12 15C13.6569 15 15 13.6568 15 12C15 10.3431 13.6569 8.99999 12 8.99999C10.3432 8.99999 9.00004 10.3431 9.00004 12C9.00004 13.6568 10.3432 15 12 15Z" fill="currentColor"/>
            </svg>
          `,c`
            bc blue
            w 100%
            h 100%
          `(c.trust`
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM10.75 10C10.75 9.30964 11.3096 8.75 12 8.75C12.6904 8.75 13.25 9.30964 13.25 10V10.1213C13.25 10.485 13.1055 10.8338 12.8483 11.091L11.4697 12.4697C11.1768 12.7626 11.1768 13.2374 11.4697 13.5303C11.7626 13.8232 12.2374 13.8232 12.5303 13.5303L13.909 12.1517C14.4475 11.6132 14.75 10.8828 14.75 10.1213V10C14.75 8.48122 13.5188 7.25 12 7.25C10.4812 7.25 9.25 8.48122 9.25 10V10.5C9.25 10.9142 9.58579 11.25 10 11.25C10.4142 11.25 10.75 10.9142 10.75 10.5V10ZM12 14.75C11.3096 14.75 10.75 15.3096 10.75 16C10.75 16.6904 11.3096 17.25 12 17.25C12.6904 17.25 13.25 16.6904 13.25 16C13.25 15.3096 12.6904 14.75 12 14.75Z" fill="currentColor"/>
            </svg>
          `)].map((e,t,r)=>c`
            position absolute
            t 102
            l 102
            w 36
            h 36
            br 18
            transform rotate(${-120+r.length*12+t*(150/r.length)}) translateY(${-(70+r.length*6)})
            will-change transform
            transition .3s transform
            [animate=entry] {
              transform rotate(-180) translateY(-80)
            }
            [animate=exit] {
              transform rotate(180) translateY(-80)
            }
          `({dom:c.animate},c`
              d grid
              pi center
              w 36
              h 36
              p 8
              br 18
              transition scale 0.3s
              cursor pointer
              bc rgb(30 30 30/65%)
              transform rotate(${r.length*12-t*(150/r.length)})
              bi linear-gradient(-185deg, rgb(211 234 255/.15), rgb(100 180 255/.15) 15%, rgb(255 0 15/.15) 80%, rgb(255 150 0/.15))
              bs 0 1 12 -4 rgb(0 0 0/.35), 0 0 4 -1 rgb(0 0 0/.35)
              :hover {
                scale 1.2

                .title {
                  o 1
                }
              }
            `({},e,c`.title
                position absolute
                o 0
                c black
                fs 10
                tt uppercase
                ff system-ui
                fw bold
                ls 2
                transition all 0.3s
                transform rotate(${-(r.length*12)+t*(150/r.length)}) translateY(-32)
              `("inspect")))))))])});function rn(e){return"#"+Po(No(Ho(Vo(e)))).map(t=>Math.round(Math.max(0,Math.min(1,t))*255).toString(16).padStart(2,"0")).join("")}function Dt([e,t,r]){return`oklch(${It(e*100,1)}% ${It(t,3)} ${It(r,1)})`}function It(e,t){let r=Math.pow(10,t);return Math.round(e*r)/r}function Po(e){return e.map(t=>{let r=Math.abs(t);return r>.0031308?(t<0?-1:1)*(1.055*r**(1/2.4)-.055):12.92*t})}function No(e){return Ut([[12831/3959,-329/214,-1974/3959],[-851781/878810,1648619/878810,36519/878810],[705/12673,-2585/12673,705/667]],e)}function Ho(e){return Ut([[1.2268798758459243,-.5578149944602171,.2813910456659647],[-.0405757452148008,1.112286803280317,-.0717110580655164],[-.0763729366746601,-.4214933324022432,1.5869240198367816]],Ut([[1,.3963377773761749,.2158037573099136],[1,-.1055613458156586,-.0638541728258133],[1,-.0894841775298119,-1.2914855480194092]],e).map(t=>t**3))}function Vo(e){return[e[0],e[1]*Math.cos(e[2]*Math.PI/180),e[1]*Math.sin(e[2]*Math.PI/180)]}function Ut(e,t){return e.map(r=>r.reduce((n,o,i)=>n+o*t[i],0))}var nn=T(()=>{});var on,sn=T(()=>{pe();ge();nn();on=c(({over:e,x:t,y:r})=>{let n,o=!1,i=c.live(),s=c.live([0,0]),a=c.live({t:0,r:0,b:0,l:0}),l=a.get(({b:d,t:m})=>d-m),g=a.get(({r:d,l:m})=>d-m),h=a.get(({t:d})=>r-d-8),f=a.get(({l:d})=>t-d-8),u=a.get(({r:d})=>d-t-9),b=a.get(({b:d})=>d-r-9);c.live.from(t,r,(d,m)=>s([d,m])),c.live.from(e,t,r,i,(d,m,O)=>{o||(o=!0,requestAnimationFrame(()=>{o=!1,a({t:A(d,m,O,0,-1).b+1,r:A(d,m,O,1,0).a,b:A(d,m,O,0,1).b,l:A(d,m,O,-1,0).a+1})}))}),p(e());function p(d,m){n=d.style.cursor,m&&(m.style.cursor=n),d.style.cursor="none"}function A(d,m,O,X,ie){let R;do R=document.elementFromPoint(m=m+X,O=O+ie);while(d===R);return{a:m,b:O}}return()=>c`
    position fixed
    zi 2146666666
    t 0
    l 0
    transform translate(${t}, ${r})
    pointer-events none
    transition opacity 0.3s
    [animate] {
      opacity 0
    }
  `({dom:[c.animate,()=>()=>e()&&(e().style.cursor=n),()=>e.observe(p),c.on(document,"copy",d=>{let m=L.color();d.preventDefault(),d.clipboardData.setData("text/plain",Dt(m)+" / "+rn(m)),L.inspect(!1)}),c.on(window,"scroll",d=>{i(d),e(document.elementFromPoint(t(),r()))})]},c`
      position absolute
      d grid
      pi center
      w 100
      t 0
      l 0
      h 32
      transition transform 0.2s
      transform translate(${t.get(d=>d>120?-108:8)}, ${s.get(([d,m])=>m>window.innerHeight-60&&(d<120||d>window.innerWidth-200)?-78:m>60?-40:8)})
      fs 12
      p 4 10
      br 16
      bc rgb(0 0 0/.85)
      backdrop-filter blur(5)
      c white
    `(g," x ",l),c`
      position absolute
      d flex
      ai center
      w 180
      gap 8
      h 32
      l 0
      t 0
      transition transform 0.2s
      transform translate(${t.get(d=>d>window.innerWidth-200?-188:8)}, ${s.get(([d,m])=>m<60?d<=120||d>window.innerWidth-200?48:8:m>window.innerHeight-60?-40:d<=120||d>window.innerWidth-200?8:-40)})
      fs 12
      p 6 8 6 6
      br 16
      bc rgb(0 0 0/.85)
      backdrop-filter blur(5)
      c white
      white-space pre
    `(c`
        flex-shrink 0
        w 20
        h 20
        br 13
        bs 0 0 0 1 rgb(255 255 255/.5)
        transition background-color .1s
        bc ${L.color.get(Dt)}
      `,c`pre`(L.color.get(([d,m,O])=>(d*100).toFixed(1)+"% "+m.toFixed(3)+" "+O.toFixed(1)))),[u,b,f,h].map((d,m)=>[c`
        position absolute
        w ${d}
        h 1
        l 0
        t 0
        transform-origin .5px .5px
        transform rotate(${m*90}) translate(8)
        backdrop-filter invert(1) grayscale(1) brightness(2)
        animation .3s .3s {
          from { scale 0 }
        }
      `,c`
        position absolute
        w 1
        h 7
        t -3
        l 0
        transform rotate(${m*90}) translateX(calc(8px + ${d}))
        backdrop-filter invert(1) grayscale(1) brightness(2)
        animation .3s .3s {
          from { scale 0 }
        }
      `]))})});function Ro(e){e.preventDefault(),e.stopPropagation();let t=e.target;for(;t;){if(t.hasOwnProperty(me)){let r=L.parseStackTrace(t[me]),n=r[3]||r.pop();if(n)return L.editor(n)}t=t.parentNode}}function $o(e){(e.metaKey||e.ctrlKey)&&e.key==="i"?(e.preventDefault(),e.stopPropagation(),window.hasOwnProperty(me)?L.inspect(!1):L.inspect(!0)):L.inspect()&&e.key==="Escape"&&L.inspect(!1)}function Bo(e){window.sintools&&window.sintools.contains(e.target)||xe(e.target)}function Fo(e){window.sintools&&window.sintools.contains(e.target)||(an(e.clientX),ln(e.clientY))}var xe,an,ln,et,jo,cn,un=T(async()=>{pe();ge();await Kt();sn();xe=c.live(document.body),an=c.live(0),ln=c.live(0),et=c.live(!1,()=>setTimeout(()=>et(!1),100)),jo=c.live.from(L.inspect,xe,et,(e,t)=>e&&(t===document.documentElement||t===document.body?{left:0,top:0,width:window.innerWidth,height:window.innerHeight}:t.getBoundingClientRect()));L.inspect.observe(e=>{e?window[me]=!0:delete window[me],Qr.redraw()});window.addEventListener("mouseover",Bo,{capture:!0,passive:!0});window.addEventListener("mousemove",Fo,{capture:!0,passive:!0});window.addEventListener("keydown",$o,{capture:!0,passive:!1});window.addEventListener("scroll",et,{capture:!0,passive:!0});cn=jo.get(e=>e&&c`
    position fixed
    z-index 2146666665
    pointer-events none
    l 0
    b 0
    r 0
    t 0
    transition opacity .3s
    [animate] {
      o 0
    }
  `({dom:[c.animate,c.on(window,"click",Ro,{capture:!0}),c.on(window,"blur",L.inspect.set(()=>!1),{capture:!0})]},on({over:xe,x:an,y:ln}),c`span
      ff monospace
      fs 10
      zi 1
      p 2 4
      bc white
      position absolute
      white-space nowrap
      br 3
      bs 0 0 3px rgba(0,0,0,.5)
      t ${e.bottom+8}
      l ${e.left}
      animation 0.3s {
        from { o 0 }
      }
    `(Math.round(e.left)+","+Math.round(e.top)+" <"+xe().tagName.toLowerCase()+"> "+Math.round(e.width)+"x"+Math.round(e.height)),c`svg
      position absolute
      top 0
      left 0
    `({width:"100%",height:"100%"},c`defs`(c`mask#hole`(c`rect`({width:"100%",height:"100%",fill:"white"}),c`rect
            transition all ${et.get(t=>t?0:".3s")}
          `({fill:"black",rx:4,ry:4,width:e.width,height:e.height,x:e.left,y:e.top}))),c`rect`({fill:"rgba(0, 150, 255, 0.5)",width:"100%",height:"100%",mask:"url(#hole)"}))))});var qo={};var fn,hn=T(async()=>{await Kt();pe();ge();tn();await un();c.scroll=!1;c.style(Object.assign(document.createElement("style"),{wat:"hej"}));fn=Object.assign(document.createElement("div"),{id:"sintools"});document.documentElement.appendChild(fn);L.redraw.observe(c.redraw);c.css`
  #sintools { font-family ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace }
  #sintools *, #sintools:before, #sintools:before { box-sizing border-box }
`;c.mount(fn,()=>[en,cn])});await Promise.resolve().then(()=>(Wt(),Zt));await hn().then(()=>qo);
