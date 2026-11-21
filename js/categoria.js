const idConsola = new URLSearchParams(location.search).get("consola");
let lista = [];

function pintar() {
  const q = $("#buscar").value.toLowerCase(), est = $("#estado").value, orden = $("#orden").value;
  const r = lista.filter(p => p.nombre.toLowerCase().includes(q) && (!est || p.estado === est));
  if (orden === "menor") r.sort((a, b) => a.precio - b.precio);
  if (orden === "mayor") r.sort((a, b) => b.precio - a.precio);
  $("#lista").innerHTML = r.length ? r.map(tarjeta).join("") : '<p class="estado">No hay productos con esos filtros.</p>';
  $("#cuenta").textContent = r.length + (r.length === 1 ? " producto" : " productos");
}

async function iniciar() {
  try {
    const consolas = await Api.consolas();
    $("#menu-consolas").innerHTML = consolas
      .map(c => `<a href="categoria.html?consola=${esc(c.id)}" class="${c.id === idConsola ? "activa" : ""}">${esc(c.nombre)}</a>`).join("");
    const actual = consolas.find(c => c.id === idConsola);
    if (!actual) {
      $("#titulo").textContent = "Consola no encontrada";
      $("#lista").innerHTML = '<p class="estado">Elige una consola del menú.</p>';
      return;
    }
    document.title = actual.nombre + " | PixelShop";
    $("#titulo").textContent = actual.nombre;
    lista = await Api.productos({ consolaId: idConsola });
    pintar();
  } catch (e) {
    $("#lista").innerHTML = '<p class="estado">No se pudo cargar la categoría. Recarga la página.</p>';
  }
}

["buscar", "estado", "orden"].forEach(x => $("#" + x).addEventListener("input", pintar));
iniciar();
