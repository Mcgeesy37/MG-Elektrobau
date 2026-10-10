(function () {
  "use strict";

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var schmal = window.matchMedia("(max-width: 760px)").matches;
  var gross = window.matchMedia("(min-width: 1000px)").matches;
  var wurzel = document.documentElement;

  function klemme(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* Bildfolge auf Canvas, gesteuert ueber den Scrollweg der umgebenden Buehne */
  function Folge(buehne) {
    var canvas = buehne.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    /* Grosse Bildschirme bekommen die 1080p-Folge, kleine die leichtere 720p-Folge */
    var pfad = (gross && buehne.dataset.pfadHd) || buehne.dataset.pfad;
    var anzahl = parseInt(buehne.dataset.bilder, 10);
    var fokusB = parseFloat(buehne.dataset.fokusB || "1");
    var fokusH = parseFloat(buehne.dataset.fokusH || "1");
    var schritt = schmal ? 2 : 1;
    var bilder = [];
    var gezeichnet = -1;
    var ziel = 0;

    function quelle(i) {
      return pfad + ("00" + i).slice(-3) + ".webp";
    }

    function naechstesGeladene(i) {
      for (var d = 0; d < anzahl; d++) {
        var a = bilder[i - d], b = bilder[i + d];
        if (a && a.fertig) return a;
        if (b && b.fertig) return b;
      }
      return null;
    }

    function zeichne(erzwingen) {
      var bild = naechstesGeladene(ziel);
      if (!bild) return;
      if (!erzwingen && bild.index === gezeichnet) return;
      gezeichnet = bild.index;
      var cw = canvas.width, ch = canvas.height;
      var iw = bild.naturalWidth, ih = bild.naturalHeight;
      var decken = Math.max(cw / iw, ch / ih);
      var fokus = Math.min(cw / (iw * fokusB), ch / (ih * fokusH));
      var s = Math.min(decken, fokus);
      var w = iw * s, h = ih * s;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#0d0e10";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(bild, (cw - w) / 2, (ch - h) / 2, w, h);
    }

    function groesse() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      zeichne(true);
    }

    function lade(i) {
      if (bilder[i]) return;
      var bild = new Image();
      bild.index = i;
      bild.decoding = "async";
      bild.onload = function () { bild.fertig = true; zeichne(false); };
      bild.src = quelle(i);
      bilder[i] = bild;
    }

    this.fortschritt = function () {
      var r = buehne.getBoundingClientRect();
      var weg = r.height - window.innerHeight;
      return weg > 0 ? klemme(-r.top / weg, 0, 1) : 1;
    };

    this.setze = function (p) {
      var i = Math.round(p * (anzahl - 1));
      ziel = i - (i % schritt);
      zeichne(false);
    };

    this.groesse = groesse;

    if (ruhig) {
      lade(anzahl - 1);
      ziel = anzahl - 1;
    } else {
      lade(0);
      var beobachter = new IntersectionObserver(function (e) {
        if (!e[0].isIntersecting) return;
        beobachter.disconnect();
        var i = 0;
        (function weiter() {
          var bis = Math.min(i + 6 * schritt, anzahl);
          for (; i < bis; i += schritt) lade(i);
          if (i < anzahl) setTimeout(weiter, 60);
        })();
      }, { rootMargin: "150% 0px" });
      beobachter.observe(buehne);
    }
    groesse();
  }

  var kopf = document.querySelector(".kopf");
  var logoBuehne = document.querySelector(".buehne--logo");
  var bauBuehne = document.querySelector(".buehne--bau");
  var logo = logoBuehne ? new Folge(logoBuehne) : null;
  var bau = bauBuehne ? new Folge(bauBuehne) : null;
  var stufen = [].slice.call(document.querySelectorAll(".stufe"));
  var takt = [].slice.call(document.querySelectorAll(".stufen__takt i"));
  var anlage = document.querySelector(".anlage__bild");

  /* Zeitpunkte, an denen im Clip der jeweilige Bereich Strom bekommt */
  var schwellen = stufen.map(function (s) { return parseFloat(s.dataset.ab); });

  function aktualisiere() {
    var hoehe = wurzel.scrollHeight - window.innerHeight;
    wurzel.style.setProperty("--fortschritt", hoehe > 0 ? (window.scrollY / hoehe).toFixed(4) : 0);
    if (kopf) kopf.classList.toggle("ist-fest", window.scrollY > 40);

    if (logo && !ruhig) {
      var p = logo.fortschritt();
      logo.setze(klemme(p / 0.78, 0, 1));
      logoBuehne.style.setProperty("--p", p.toFixed(3));
      logoBuehne.style.setProperty("--text", klemme((p - 0.7) / 0.2, 0, 1).toFixed(3));
    }

    if (bau && !ruhig) {
      var q = bau.fortschritt();
      bau.setze(klemme((q - 0.04) / 0.86, 0, 1));
      var aktiv = -1;
      schwellen.forEach(function (ab, i) { if (q >= ab) aktiv = i; });
      stufen.forEach(function (s, i) { s.classList.toggle("ist-aktiv", i === aktiv); });
      takt.forEach(function (t, i) { t.classList.toggle("ist-an", i <= aktiv); });
    }

    if (anlage && !ruhig) {
      var r = anlage.getBoundingClientRect();
      var sicht = klemme((window.innerHeight - r.top) / (window.innerHeight + r.height), 0, 1);
      anlage.style.setProperty("--sicht", sicht.toFixed(3));
    }
  }

  var wartet = false;
  function beiScroll() {
    if (wartet) return;
    wartet = true;
    requestAnimationFrame(function () { wartet = false; aktualisiere(); });
  }

  window.addEventListener("scroll", beiScroll, { passive: true });
  window.addEventListener("resize", function () {
    if (logo) logo.groesse();
    if (bau) bau.groesse();
    aktualisiere();
  });
  aktualisiere();

  /* Bauteil-Marken: per Tippen oeffnen, Escape schliesst */
  var marken = [].slice.call(document.querySelectorAll(".marken li"));
  marken.forEach(function (li) {
    var knopf = li.querySelector("button");
    knopf.addEventListener("click", function () {
      var offen = li.classList.contains("ist-offen");
      marken.forEach(function (m) {
        m.classList.remove("ist-offen");
        m.querySelector("button").setAttribute("aria-expanded", "false");
      });
      if (!offen) {
        li.classList.add("ist-offen");
        knopf.setAttribute("aria-expanded", "true");
      }
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    marken.forEach(function (m) {
      m.classList.remove("ist-offen");
      m.querySelector("button").setAttribute("aria-expanded", "false");
    });
  });
})();
