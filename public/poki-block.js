(function () {
  var POKI_PATTERN = /poki\.(com|io)|poki-cdn\.com/i;
  var MOCK_RESPONSE = '{"success":true}';

  function isPoki(url) {
    return url && POKI_PATTERN.test(url.toString());
  }

  // 1. fetch 오버라이드
  var _origFetch = window.fetch.bind(window);
  window.fetch = function (url) {
    if (isPoki(url)) {
      return Promise.resolve(new Response(MOCK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    return _origFetch.apply(this, arguments);
  };

  // 2. XHR 오버라이드
  var _origXHROpen = XMLHttpRequest.prototype.open;
  var _origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._pokiBlocked = isPoki(url);
    if (!this._pokiBlocked) _origXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (this._pokiBlocked) {
      var self = this;
      setTimeout(function () {
        Object.defineProperty(self, 'readyState', { get: function () { return 4; } });
        Object.defineProperty(self, 'status',    { get: function () { return 200; } });
        Object.defineProperty(self, 'responseText', { get: function () { return MOCK_RESPONSE; } });
        if (self.onreadystatechange) self.onreadystatechange();
        if (self.onload) self.onload();
      }, 0);
      return;
    }
    _origXHRSend.apply(this, arguments);
  };

  // 3. window.open → {} 반환 (_dmSysOpenURL fallback 방지)
  var _origWindowOpen = window.open.bind(window);
  window.open = function (url) {
    if (isPoki(url)) return {};
    return _origWindowOpen.apply(this, arguments);
  };

  // 4. 동적 <script> src 차단
  var _origCreate = document.createElement.bind(document);
  document.createElement = function (tag) {
    var el = _origCreate(tag);
    if (tag.toLowerCase() === 'script') {
      Object.defineProperty(el, 'src', {
        set: function (val) {
          if (isPoki(val)) return;
          Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set.call(el, val);
        },
        get: function () {
          return Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').get.call(el);
        }
      });
    }
    return el;
  };

  // 5. eval 인터셉터 — Defold html5.run()이 eval()로 실행하는 sitelock 체크 차단
  // html5.run("window.location.hostname") → 'poki.com' 반환
  // html5.run("window.location.href='https://poki.com/sitelock'") → 차단
  try {
    var _origEval = window.eval;
    window.eval = function (code) {
      if (typeof code === 'string') {
        var t = code.trim();
        if (t === 'window.location.hostname' || t === 'location.hostname') return 'poki.com';
        if (t === 'window.location.host'     || t === 'location.host')     return 'poki.com';
        if (t === 'window.location.origin'   || t === 'location.origin')   return 'https://poki.com';
        if (t === 'window.location.href'     || t === 'location.href')     return 'https://poki.com/en/g/lands-of-blight';
        // poki URL이 포함된 이동 코드 차단
        if (POKI_PATTERN.test(code) && /location|open|navigate/.test(code)) return undefined;
      }
      return _origEval.call(this, code);
    };
  } catch (e) {}

  // 6. Location.prototype 오버라이드 — hostname 스푸핑 + href setter로 sitelock 이동 차단
  try {
    Object.defineProperty(Location.prototype, 'hostname', {
      get: function () { return 'poki.com'; }, configurable: true
    });
    Object.defineProperty(Location.prototype, 'host', {
      get: function () { return 'poki.com'; }, configurable: true
    });
    Object.defineProperty(Location.prototype, 'origin', {
      get: function () { return 'https://poki.com'; }, configurable: true
    });
    Object.defineProperty(Location.prototype, 'href', {
      get: function () { return 'https://poki.com/en/g/lands-of-blight'; },
      set: function (url) { if (isPoki(url)) return; /* sitelock 이동 차단 */ },
      configurable: true
    });
    var _origProtoAssign = Location.prototype.assign;
    Location.prototype.assign = function (url) {
      if (isPoki(url)) return;
      _origProtoAssign.call(this, url);
    };
    var _origProtoReplace = Location.prototype.replace;
    Location.prototype.replace = function (url) {
      if (isPoki(url)) return;
      _origProtoReplace.call(this, url);
    };
  } catch (e) {}

  // 7. window.location Proxy — 위 방법이 모두 막혔을 때 최후 방어선
  try {
    var _rl = window.location;
    var locProxy = new Proxy(_rl, {
      get: function (target, prop) {
        if (prop === 'hostname' || prop === 'host') return 'poki.com';
        if (prop === 'origin')  return 'https://poki.com';
        if (prop === 'href')    return 'https://poki.com/en/g/lands-of-blight';
        if (prop === 'assign')  return function (url) { if (!isPoki(url)) target.assign.call(target, url); };
        if (prop === 'replace') return function (url) { if (!isPoki(url)) target.replace.call(target, url); };
        var v = target[prop];
        return typeof v === 'function' ? v.bind(target) : v;
      },
      set: function (target, prop, value) {
        if (prop === 'href' && isPoki(value)) return true;
        target[prop] = value;
        return true;
      }
    });
    Object.defineProperty(window, 'location', {
      get: function () { return locProxy; },
      configurable: true
    });
  } catch (e) {}

  // PokiSDK Mock — WASM 내부에서 직접 호출하므로 반드시 존재해야 함
  window.PokiSDK = {
    init: function () { return Promise.resolve(); },
    gameLoadingStart: function () {},
    gameLoadingFinished: function () {},
    gameLoadingProgress: function () {},
    gameplayStart: function () {},
    gameplayStop: function () {},
    commercialBreak: function () { return Promise.resolve(); },
    rewardedBreak: function () { return Promise.resolve(true); },
    shareableURL: function () { return Promise.resolve(''); },
    getURLParam: function () { return ''; },
    isAdBlocked: function () { return false; },
    captureError: function () {},
    setDebug: function () {},
  };
})();
