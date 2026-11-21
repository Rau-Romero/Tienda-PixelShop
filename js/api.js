// Conexión con MockAPI y utilidades compartidas por todas las páginas
const API = "https://6afeead53a0e70bc8d543484.mockapi.io";

async function pedir(ruta, opciones) {
  const r = await fetch(API + ruta, opciones);
  if (r.status === 404 && (!opciones || !opciones.method)) return []; // MockAPI responde 404 cuando un filtro no tiene resultados
  if (!r.ok) throw new Error("Error " + r.status);
  return r.json();
}

const JSON_HEADERS = { "Content-Type": "application/json" };

const Api = {
  consolas: () => pedir("/consolas?sortBy=orden&order=asc"),
  productos: (filtros = {}) => pedir("/productos?" + new URLSearchParams(filtros)),
  producto: id => pedir("/productos/" + id),
  crear: datos => pedir("/productos", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(datos) }),
  editar: (id, datos) => pedir("/productos/" + id, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(datos) }),
  eliminar: id => pedir("/productos/" + id, { method: "DELETE" }),
  crearConsola: d => pedir("/consolas", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(d) }),
  editarConsola: (id, d) => pedir("/consolas/" + id, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(d) }),
  eliminarConsola: id => pedir("/consolas/" + id, { method: "DELETE" })
};

// Portada automática: si el producto no tiene imagen propia, se dibuja una con su nombre
function lineas(texto, max = 16) {
  const out = []; let l = "";
  for (const w of texto.split(" ")) {
    if ((l + " " + w).trim().length > max && l) { out.push(l); l = w; } else l = (l + " " + w).trim();
  }
  if (l) out.push(l);
  return out.slice(0, 4);
}

function portada(p) {
  if (p.imagen && !p.imagen.includes("placehold.co")) return p.imagen;
  let h = 0;
  for (const ch of p.nombre) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const ls = lineas(p.nombre);
  const texto = ls.map((t, i) => `<text x="40" y="${210 - (ls.length - 1) * 26 + i * 52}" font-size="44" font-weight="800" fill="#fff" font-family="Arial,sans-serif">${esc(t)}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><rect width="640" height="480" fill="hsl(${h},45%,22%)"/><rect y="400" width="640" height="80" fill="hsl(${h},70%,58%)"/><text x="40" y="450" font-size="28" font-weight="700" fill="hsl(${h},60%,12%)" font-family="Arial,sans-serif">${esc(p.tipo)}</text>${texto}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const $ = sel => document.querySelector(sel);

function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function euros(n) {
  return Number(n).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function tarjeta(p) {
  const oferta = Number(p.precioAnterior) > Number(p.precio);
  const reserva = p.estado === "reserva";
  vistos[p.id] = p;
  const agotado = Number(p.stock) <= 0;
  const pocas = !agotado && Number(p.stock) <= 5 ? `<p class="meta poco">Quedan ${esc(p.stock)}</p>` : "";
  const etiqueta = oferta ? '<span class="etiqueta oferta">Oferta</span>' : reserva ? '<span class="etiqueta">Reserva</span>' : "";
  const fecha = reserva ? `<p class="meta">Disponible el ${new Date(p.fechaLanzamiento + "T00:00").toLocaleDateString("es-ES")}</p>` : "";
  return `<article class="tarjeta">
    <img src="${esc(portada(p))}" alt="${esc(p.nombre)}" loading="lazy">
    <div class="tarjeta-cuerpo">
      ${etiqueta}
      <h3>${esc(p.nombre)}</h3>
      <p class="meta">Edición ${esc(p.edicion)}</p>
      ${fecha}
      ${pocas}
      <div class="precio-fila">
        <span class="precio">${euros(p.precio)}</span>
        ${oferta ? `<span class="antes">${euros(p.precioAnterior)}</span>` : ""}
      </div>
      <button class="btn" data-id="${p.id}" ${agotado ? "disabled" : ""}>${agotado ? "Agotado" : reserva ? "Reservar ahora" : "Añadir a cesta"}</button>
    </div>
  </article>`;
}

// ===== Cesta (se guarda en el navegador) =====
const vistos = {}; // productos mostrados, para comprobar el stock al añadir
const Cesta = {
  leer() { try { return JSON.parse(localStorage.getItem("cesta")) || {}; } catch (e) { return {}; } },
  guardar(c) { try { localStorage.setItem("cesta", JSON.stringify(c)); } catch (e) {} actualizarContador(); },
  cantidad(id) { return this.leer()[id] || 0; },
  total() { return Object.values(this.leer()).reduce((a, n) => a + n, 0); },
  poner(id, n) { const c = this.leer(); if (n > 0) c[id] = n; else delete c[id]; this.guardar(c); },
  vaciar() { this.guardar({}); }
};

function actualizarContador() {
  const c = $("#carrito");
  if (c) c.textContent = "Cesta (" + Cesta.total() + ")";
}

function toast(texto, error) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = texto;
  t.className = "toast" + (error ? " mal" : "");
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 3000);
}

document.addEventListener("click", e => {
  const b = e.target.closest(".btn[data-id]");
  const p = b && vistos[b.dataset.id];
  if (!p) return;
  const n = Cesta.cantidad(p.id);
  if (n + 1 > Number(p.stock)) return toast(`Solo quedan ${p.stock} unidades de «${p.nombre}».`, true);
  Cesta.poner(p.id, n + 1);
  toast(`«${p.nombre}» añadido a la cesta.`);
});

actualizarContador();
