// Clave de práctica. MockAPI no tiene autenticación: esto NO es seguridad real.
const USUARIO = "admin";
const CLAVE = "admin123";
let consolas = [], productos = [];

function aviso(texto, error) {
  const a = $("#aviso");
  a.textContent = texto;
  a.className = "aviso" + (error ? " mal" : "");
  a.hidden = false;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => (a.hidden = true), 4000);
}

function entrar() {
  $("#login").hidden = true;
  $("#panel").hidden = false;
  $("#salir").hidden = false;
  cargar();
}

async function cargar() {
  try {
    [consolas, productos] = await Promise.all([Api.consolas(), Api.productos()]);
    selects();
    tabla();
    tablaC();
  } catch (e) {
    aviso("No se pudieron cargar los datos. Recarga la página.", true);
  }
}

// READ: lista de productos
function tabla() {
  const q = $("#buscar").value.toLowerCase(), cid = $("#filtro-consola").value;
  const lista = productos.filter(p => (!cid || p.consolaId === cid) && p.nombre.toLowerCase().includes(q));
  const consola = id => (consolas.find(c => c.id === id) || {}).nombre || "Sin consola";
  $("#filas").innerHTML = lista.length
    ? lista.map(p => `<tr>
        <td><img class="mini" src="${esc(portada(p))}" alt=""></td>
        <td>${esc(p.nombre)}<br><span class="meta">Edición ${esc(p.edicion)}</span></td>
        <td>${esc(consola(p.consolaId))}</td>
        <td>${esc(p.tipo)}</td>
        <td>${euros(p.precio)}</td>
        <td>${esc(p.stock)}</td>
        <td><span class="etiqueta ${p.estado === "reserva" ? "" : "ok"}">${p.estado === "reserva" ? "Reserva" : "Disponible"}</span></td>
        <td class="acciones">
          <button class="btn-mini" data-accion="editar" data-id="${esc(p.id)}">Editar</button>
          <button class="btn-mini peligro" data-accion="eliminar" data-id="${esc(p.id)}">Eliminar</button>
        </td></tr>`).join("")
    : '<tr><td colspan="8" class="estado">No hay productos. Crea el primero con «Nuevo producto».</td></tr>';
  $("#total").textContent = lista.length + (lista.length === 1 ? " producto" : " productos");
}

// CREATE / UPDATE: abrir el formulario
function abrir(p, consolaId) {
  const f = $("#form");
  f.reset();
  $("#titulo-form").textContent = p ? "Editar producto" : "Nuevo producto";
  f.pid.value = p ? p.id : "";
  if (!p && consolaId) f.consolaId.value = consolaId;
  if (p) {
    ["nombre", "descripcion", "precio", "precioAnterior", "imagen", "consolaId", "tipo", "edicion", "stock", "estado", "fechaLanzamiento"]
      .forEach(k => (f.elements[k].value = p[k] ?? ""));
    if (/placehold\.co/.test(p.imagen)) f.imagen.value = "";
    f.destacado.checked = !!p.destacado;
  }
  $("#dlg").showModal();
}

$("#form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, id = f.pid.value;
  const datos = {
    nombre: f.nombre.value.trim(),
    descripcion: f.descripcion.value.trim(),
    precio: Number(f.precio.value),
    precioAnterior: Number(f.precioAnterior.value || 0),
    imagen: f.imagen.value.trim(),
    consolaId: f.consolaId.value,
    tipo: f.tipo.value,
    edicion: f.edicion.value.trim(),
    stock: Number(f.stock.value),
    estado: f.estado.value,
    fechaLanzamiento: f.fechaLanzamiento.value,
    destacado: f.destacado.checked
  };
  try {
    if (id) {
      const nuevo = await Api.editar(id, datos);
      productos = productos.map(p => (p.id === id ? nuevo : p));
      aviso("Cambios guardados.");
    } else {
      productos.push(await Api.crear(datos));
      aviso("Producto creado.");
    }
    $("#dlg").close();
    tabla();
  } catch (err) {
    aviso("No se pudo guardar el producto. Revisa los datos e inténtalo otra vez.", true);
  }
});

// UPDATE (editar) y DELETE (eliminar) desde la tabla
$("#filas").addEventListener("click", async e => {
  const b = e.target.closest("button[data-accion]");
  if (!b) return;
  const p = productos.find(x => x.id === b.dataset.id);
  if (b.dataset.accion === "editar") return abrir(p);
  if (!confirm(`¿Eliminar «${p.nombre}»? Esta acción no se puede deshacer.`)) return;
  try {
    await Api.eliminar(p.id);
    productos = productos.filter(x => x.id !== p.id);
    tabla();
    aviso("Producto eliminado.");
  } catch (err) {
    aviso("No se pudo eliminar el producto.", true);
  }
});

$("#nuevo").addEventListener("click", () => abrir(null));
$("#cancelar").addEventListener("click", () => $("#dlg").close());
$("#buscar").addEventListener("input", tabla);
$("#filtro-consola").addEventListener("input", tabla);
$("#salir").addEventListener("click", () => { sessionStorage.removeItem("admin"); location.reload(); });

$("#form-login").addEventListener("submit", e => {
  e.preventDefault();
  if ($("#usuario").value.trim() === USUARIO && $("#clave").value === CLAVE) { sessionStorage.setItem("admin", "1"); entrar(); }
  else $("#login-error").textContent = "Usuario o contraseña incorrectos.";
});

// ===== CRUD de consolas =====
function selects() {
  const opciones = consolas.map(c => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join("");
  $("#f-consola").innerHTML = opciones;
  $("#filtro-consola").innerHTML = '<option value="">Todas las consolas</option>' + opciones;
}

// READ: lista de consolas
function tablaC() {
  const n = id => productos.filter(p => p.consolaId === id).length;
  $("#filas-c").innerHTML = consolas.length
    ? consolas.map(c => `<tr>
        <td>${esc(c.orden)}</td><td>${esc(c.nombre)}</td><td>${esc(c.slug)}</td><td>${n(c.id)}</td>
        <td class="acciones">
          <button class="btn-mini" data-accion="producto" data-id="${esc(c.id)}">Agregar producto</button>
          <button class="btn-mini" data-accion="editar" data-id="${esc(c.id)}">Editar</button>
          <button class="btn-mini peligro" data-accion="eliminar" data-id="${esc(c.id)}">Eliminar</button>
        </td></tr>`).join("")
    : '<tr><td colspan="5" class="estado">No hay consolas. Crea la primera con «Nueva consola».</td></tr>';
}

// CREATE / UPDATE: formulario de consola
function abrirC(c) {
  const f = $("#form-c");
  f.reset();
  $("#titulo-c").textContent = c ? "Editar consola" : "Nueva consola";
  f.cid.value = c ? c.id : "";
  if (c) { f.nombre.value = c.nombre; f.slug.value = c.slug; f.orden.value = c.orden; }
  else f.orden.value = consolas.length + 1;
  $("#dlg-c").showModal();
}

$("#form-c").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, id = f.cid.value, nombre = f.nombre.value.trim();
  const slug = (f.slug.value.trim() || nombre).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const datos = { ...(consolas.find(c => c.id === id) || { logo: "" }), nombre, slug, orden: Number(f.orden.value) };
  delete datos.id;
  try {
    if (id) {
      const nueva = await Api.editarConsola(id, datos);
      consolas = consolas.map(c => (c.id === id ? nueva : c));
      aviso("Consola actualizada.");
    } else {
      consolas.push(await Api.crearConsola(datos));
      aviso("Consola creada. Ya aparece en el menú de la tienda; agrégale productos con «Agregar producto».");
    }
    consolas.sort((a, b) => a.orden - b.orden);
    selects(); tabla(); tablaC();
    $("#dlg-c").close();
  } catch (err) {
    aviso("No se pudo guardar la consola. Inténtalo otra vez.", true);
  }
});

// UPDATE, DELETE y "Agregar producto" desde la tabla de consolas
$("#filas-c").addEventListener("click", async e => {
  const b = e.target.closest("button[data-accion]");
  if (!b) return;
  const c = consolas.find(x => x.id === b.dataset.id);
  if (b.dataset.accion === "editar") return abrirC(c);
  if (b.dataset.accion === "producto") {
    document.querySelector('.tab[data-vista="productos"]').click();
    return abrir(null, c.id);
  }
  const n = productos.filter(p => p.consolaId === c.id).length;
  if (n) return aviso(`No se puede eliminar «${c.nombre}»: tiene ${n} producto(s). Elimínalos o cámbialos de consola primero.`, true);
  if (!confirm(`¿Eliminar la consola «${c.nombre}»? Esta acción no se puede deshacer.`)) return;
  try {
    await Api.eliminarConsola(c.id);
    consolas = consolas.filter(x => x.id !== c.id);
    selects(); tabla(); tablaC();
    aviso("Consola eliminada.");
  } catch (err) {
    aviso("No se pudo eliminar la consola.", true);
  }
});

$("#nueva-consola").addEventListener("click", () => abrirC(null));
$("#cancelar-c").addEventListener("click", () => $("#dlg-c").close());

// Pestañas Productos / Consolas
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("activa", x === t));
  $("#vista-productos").hidden = t.dataset.vista !== "productos";
  $("#vista-consolas").hidden = t.dataset.vista !== "consolas";
}));

if (sessionStorage.getItem("admin") === "1") entrar();
