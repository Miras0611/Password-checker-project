window.addEventListener("load", function () { brython(); });

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var MAX_TRIES = 5;
  var LOCK_MS = 2 * 60 * 60 * 1000; // 2 часа
  var K_ACC = "pwgate.account", K_TRIES = "pwgate.fails", K_LOCK = "pwgate.lockUntil";

  var mem = {};
  function get(k) { try { var v = localStorage.getItem(k); return v === null ? (mem[k] || null) : v; } catch (e) { return mem[k] || null; } }
  function set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  function del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }

  async function hashPw(pw, salt) {
    if (window.crypto && crypto.subtle) {
      var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pw));
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    }
    return "plain:" + pw;
  }
  function randomSalt() {
    var a = new Uint8Array(8);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (var i = 0; i < 8; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.from(a).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  var timer = null;

  function show(which) {
    $("view-register").hidden = which !== "register";
    $("view-login").hidden = which !== "login";
  }
  function getAccount() { try { return JSON.parse(get(K_ACC)); } catch (e) { return null; } }
  function fails() { return parseInt(get(K_TRIES) || "0", 10) || 0; }
  function lockUntil() { return parseInt(get(K_LOCK) || "0", 10) || 0; }

  function fmt(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return [h, m, r].map(function (x) { return String(x).padStart(2, "0"); }).join(":");
  }

  function renderLoginState() {
    var left = lockUntil() - Date.now();
    var locked = left > 0;
    if (!locked && lockUntil()) { del(K_LOCK); del(K_TRIES); }
    $("log-login").disabled = locked;
    $("log-pass").disabled = locked;
    $("log-btn").disabled = locked;
    $("lock").hidden = !locked;
    if (locked) {
      $("lock").textContent = "Блокировка. Попробуй через " + fmt(left);
      $("attempts").textContent = "";
      if (!timer) timer = setInterval(renderLoginState, 1000);
    } else {
      $("attempts").textContent = "Осталось попыток: " + (MAX_TRIES - fails()) + " из " + MAX_TRIES;
      if (timer) { clearInterval(timer); timer = null; }
    }
  }

  function openLogin(note) {
    show("login");
    $("status").textContent = note || "";
    $("status").className = "";
    $("log-form").hidden = false;
    $("logout-btn").hidden = true;
    $("log-login").value = "";
    $("log-pass").value = "";
    renderLoginState();
  }

  function openRegister() {
    show("register");
    $("reg-form").reset();
    $("reg-msg").textContent = "";
    $("reg-msg").className = "msg";
    $("reg-btn").disabled = true;
    $("level-label").textContent = "введите пароль";
    $("tips").textContent = "";
    for (var i = 1; i <= 4; i++) $("seg" + i).className = "seg";
  }

  // регистрация
  $("reg-toggle").addEventListener("click", function () {
    var p = $("reg-pass");
    var showIt = p.type === "password";
    p.type = showIt ? "text" : "password";
    this.textContent = showIt ? "скрыть" : "показать";
    this.setAttribute("aria-pressed", showIt ? "true" : "false");
  });

  $("reg-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var msg = $("reg-msg");
    var login = $("reg-login").value.trim();
    var pw = $("reg-pass").value;
    msg.className = "msg err";
    if (login.length < 3) { msg.textContent = "Логин: минимум 3 символа."; return; }
    if (!window.pwReady || !window.pwLevel) { msg.textContent = "Python еще не загрузился, подожди секунду."; return; }
    if (window.pwLevel(pw) < 4) { msg.textContent = "Пароль должен быть уровня 4."; return; }
    var salt = randomSalt();
    var h = await hashPw(pw, salt);
    set(K_ACC, JSON.stringify({ login: login, salt: salt, hash: h }));
    del(K_TRIES); del(K_LOCK);
    openLogin("Аккаунт создан. Теперь войди.");
  });

  // вход
  $("log-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (lockUntil() > Date.now()) { renderLoginState(); return; }
    var acc = getAccount();
    if (!acc) { openRegister(); return; }
    var h = await hashPw($("log-pass").value, acc.salt);
    var ok = $("log-login").value.trim() === acc.login && h === acc.hash;
    var st = $("status");
    if (ok) {
      del(K_TRIES);
      st.textContent = "success";
      st.className = "success";
      $("log-form").hidden = true;
      $("logout-btn").hidden = false;
      $("attempts").textContent = "";
    } else {
      var n = fails() + 1;
      set(K_TRIES, String(n));
      if (n >= MAX_TRIES) set(K_LOCK, String(Date.now() + LOCK_MS));
      st.textContent = "failed";
      st.className = "failed";
      $("log-pass").value = "";
      renderLoginState();
    }
  });

  $("logout-btn").addEventListener("click", function () { openLogin(""); });

  // сброс
  $("reset-btn").addEventListener("click", function () {
    del(K_ACC); del(K_TRIES); del(K_LOCK);
    if (timer) { clearInterval(timer); timer = null; }
    openRegister();
  });

  // старт
  if (getAccount()) openLogin(""); else openRegister();

  // если python не запустился
  setTimeout(function () {
    if (!window.pwReady) {
      var c = $("py-chip");
      c.textContent = "python: не загрузился";
      c.className = "chip bad";
      $("reg-msg").textContent = "Проверка пароля работает на Python (Brython). Он не загрузился, регистрация недоступна.";
      $("reg-msg").className = "msg err";
    }
  }, 6000);
})();
