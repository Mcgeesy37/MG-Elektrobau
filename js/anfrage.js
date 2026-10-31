(function () {
  "use strict";

  var form = document.getElementById("anfrage");
  if (!form) return;

  /* Vorbelegung aus dem Link der Orts- oder Leistungsseite */
  var q = new URLSearchParams(window.location.search);
  if (q.get("ort")) form.elements.ort.value = q.get("ort");
  if (q.get("leistung")) {
    [].forEach.call(form.querySelectorAll('input[name="leistung"]'), function (box) {
      if (box.dataset.slug === q.get("leistung")) box.checked = true;
    });
  }

  var fehler = form.querySelector(".fehler");

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var fehlend = [].filter.call(form.querySelectorAll("[required]"), function (f) {
      return !f.value.trim();
    });
    [].forEach.call(form.querySelectorAll("[aria-invalid]"), function (f) { f.removeAttribute("aria-invalid"); });
    if (fehlend.length) {
      fehlend.forEach(function (f) { f.setAttribute("aria-invalid", "true"); });
      fehler.textContent = "Bitte füllen Sie die markierten Pflichtfelder aus.";
      fehler.hidden = false;
      fehlend[0].focus();
      return;
    }
    fehler.hidden = true;

    var w = function (n) { return (form.elements[n].value || "").trim() || "-"; };
    var leistungen = [].filter.call(form.querySelectorAll('input[name="leistung"]'), function (b) { return b.checked; })
      .map(function (b) { return b.value; }).join(", ") || "-";

    var text = [
      "Projektanfrage über die Website",
      "",
      "Art des Projekts: " + w("art"),
      "Leistungen: " + leistungen,
      "Ort / PLZ: " + w("ort"),
      "Fläche: " + w("flaeche") + " m²",
      "Geplanter Start: " + w("start"),
      "Unterlagen: " + w("unterlagen"),
      "",
      "Beschreibung:",
      w("nachricht"),
      "",
      "Name: " + w("name"),
      "Firma: " + w("firma"),
      "Telefon: " + w("telefon"),
      "E-Mail: " + w("email")
    ].join("\n");

    var betreff = "Anfrage: " + w("art") + " in " + w("ort");
    window.location.href = "mailto:" + form.dataset.empfaenger +
      "?subject=" + encodeURIComponent(betreff) + "&body=" + encodeURIComponent(text);
  });
})();
