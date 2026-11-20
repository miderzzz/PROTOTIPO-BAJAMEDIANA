/** Página de carga que se sirve en GET / para validar listados desde el navegador. */
export const PAGINA_CARGA = /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Validar pedido · Sport Champion</title>
<style>
  :root { --borde:#d9dce1; --texto:#1d2330; --suave:#5f6b7a; --ok:#1a7f45; --error:#c0392b; --adv:#b7791f; --fondo:#f6f7f9; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:var(--texto); background:var(--fondo); }
  main { max-width: 1000px; margin: 0 auto; padding: 32px 20px 60px; }
  h1 { font-size: 1.5rem; margin: 0 0 4px; }
  p.sub { color: var(--suave); margin: 0 0 24px; }
  .zona { display:block; width:100%; border: 2px dashed var(--borde); border-radius: 12px; background:#fff; padding: 36px 20px; text-align:center; cursor:pointer; transition: border-color .15s, background .15s; }
  .zona.activa { border-color:#3b6fd8; background:#f0f5ff; }
  .zona strong { display:block; font-size:1.05rem; margin-bottom:6px; }
  .zona span { display:block; color: var(--suave); font-size:.9rem; }
  input[type=file] { display:none; }
  .estado { margin: 20px 0 0; font-weight:600; }
  .tarjetas { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap:12px; margin: 20px 0; }
  .tarjeta { background:#fff; border:1px solid var(--borde); border-radius:10px; padding:14px 16px; }
  .tarjeta .n { font-size:1.6rem; font-weight:700; }
  .tarjeta .l { color:var(--suave); font-size:.85rem; }
  .banner { padding:14px 16px; border-radius:10px; font-weight:600; margin-top:20px; }
  .banner.ok { background:#e7f6ec; color:var(--ok); }
  .banner.mal { background:#fdecea; color:var(--error); }
  h2 { font-size:1.1rem; margin: 28px 0 10px; }
  table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--borde); border-radius:10px; overflow:hidden; font-size:.92rem; }
  th, td { text-align:left; padding:9px 12px; border-bottom:1px solid var(--borde); vertical-align:top; }
  th { background:#eef0f3; font-weight:600; }
  tr:last-child td { border-bottom:none; }
  .sev { font-weight:600; white-space:nowrap; }
  .sev.error { color:var(--error); }
  .sev.advertencia { color:var(--adv); }
  .meta { color:var(--suave); font-size:.88rem; margin-top:8px; }
  .oculto { display:none; }
</style>
</head>
<body>
<main>
  <h1>Validar listado de uniformes</h1>
  <p class="sub">Sube el Excel (.xlsx) o CSV del pedido y revisa nombres, dorsales y tallas antes de cotizar.</p>

  <label class="zona" id="zona">
    <input type="file" id="archivo" accept=".xlsx,.csv">
    <strong>Arrastra el archivo aquí o haz clic para elegirlo</strong>
    <span>.xlsx o .csv · máximo 4 MB</span>
  </label>

  <div id="estado" class="estado"></div>
  <div id="resultado" class="oculto"></div>
</main>

<script>
const zona = document.getElementById("zona");
const input = document.getElementById("archivo");
const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

input.addEventListener("change", () => input.files[0] && enviar(input.files[0]));
["dragenter","dragover"].forEach((t) => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.add("activa"); }));
["dragleave","drop"].forEach((t) => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.remove("activa"); }));
zona.addEventListener("drop", (e) => e.dataTransfer.files[0] && enviar(e.dataTransfer.files[0]));

async function enviar(archivo) {
  estado.textContent = "Validando " + archivo.name + "…";
  resultado.className = "oculto";
  const datos = new FormData();
  datos.append("archivo", archivo);
  try {
    const resp = await fetch("/api/pedidos/validar", { method: "POST", body: datos });
    const json = await resp.json();
    if (json.error) { estado.textContent = "❌ " + json.error; return; }
    estado.textContent = "Archivo: " + archivo.name;
    pintar(json);
  } catch (e) {
    estado.textContent = "❌ No se pudo contactar el servidor. ¿Sigue corriendo npm run server?";
  } finally {
    input.value = "";
  }
}

function pintar(r) {
  const s = r.resumen;
  const curva = Object.entries(s.curvaTallas).map(([t, n]) => esc(t) + ": " + n).join(" · ") || "—";
  let html = '<div class="banner ' + (r.valido ? "ok" : "mal") + '">' +
    (r.valido ? "✅ Pedido listo para cotizar" : "❌ Corrige los errores para continuar") + "</div>";
  html += '<div class="tarjetas">' +
    tarjeta(s.filasTotal, "filas") + tarjeta(s.filasValidas, "válidas") +
    tarjeta(s.filasConError, "con error") + tarjeta(s.advertencias, "advertencias") + "</div>";
  html += '<div class="meta"><b>Curva de tallas:</b> ' + curva + "</div>";
  const cols = Object.entries(r.mapaColumnas || {}).map(([c, h]) => esc(h) + " → " + esc(c)).join(" · ");
  html += '<div class="meta"><b>Columnas reconocidas:</b> ' + cols +
    (r.columnasIgnoradas?.length ? " · <b>Ignoradas:</b> " + r.columnasIgnoradas.map(esc).join(", ") : "") + "</div>";

  if (r.hallazgos.length) {
    html += "<h2>Hallazgos (" + r.hallazgos.length + ")</h2><table><thead><tr>" +
      "<th>Fila</th><th>Tipo</th><th>Campo</th><th>Mensaje</th><th>Valor</th><th>Sugerencia</th></tr></thead><tbody>";
    for (const h of r.hallazgos) {
      html += "<tr><td>" + (h.fila || "—") + '</td><td class="sev ' + esc(h.severidad) + '">' +
        (h.severidad === "error" ? "✖ Error" : "⚠ Aviso") + "</td><td>" + esc(h.campo) + "</td><td>" +
        esc(h.mensaje) + "</td><td>" + esc(h.valorOriginal) + "</td><td>" + esc(h.sugerencia) + "</td></tr>";
    }
    html += "</tbody></table>";
  }

  if (r.prendas.length) {
    html += "<h2>Prendas listas (" + r.prendas.length + ")</h2><table><thead><tr>" +
      "<th>Fila</th><th>Nombre</th><th>Número</th><th>Talla</th><th>Equipo</th></tr></thead><tbody>";
    for (const p of r.prendas) {
      html += "<tr><td>" + p.fila + "</td><td>" + esc(p.nombre) + "</td><td>" + p.numero +
        "</td><td>" + esc(p.talla) + "</td><td>" + esc(p.equipo) + "</td></tr>";
    }
    html += "</tbody></table>";
  }
  resultado.innerHTML = html;
  resultado.className = "";
}

const tarjeta = (n, l) => '<div class="tarjeta"><div class="n">' + n + '</div><div class="l">' + l + "</div></div>";
</script>
</body>
</html>`;
