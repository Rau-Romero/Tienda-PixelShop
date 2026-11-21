function pintar(selector, lista) {
  $(selector).innerHTML = lista.length
    ? lista.slice(0, 8).map(tarjeta).join("")
    : '<p class="estado">Todavía no hay productos aquí.</p>';
}

async function iniciar() {
  try {
    const [consolas, productos] = await Promise.all([Api.consolas(), Api.productos()]);
    $("#menu-consolas").innerHTML = consolas
      .map(c => `<a href="categoria.html?consola=${esc(c.id)}">${esc(c.nombre)}</a>`)
      .join("");
    $("#tiles").innerHTML = consolas.map(c => {
      const n = productos.filter(p => p.consolaId === c.id).length;
      return `<a class="tile" href="categoria.html?consola=${esc(c.id)}"><strong>${esc(c.nombre)}</strong><span>${n} ${n === 1 ? "producto" : "productos"}</span></a>`;
    }).join("");
    pintar("#destacados", productos.filter(p => p.destacado));
    pintar("#reservas-grid", productos.filter(p => p.estado === "reserva"));
    pintar("#ofertas", productos.filter(p => Number(p.precioAnterior) > Number(p.precio)));
  } catch (e) {
    $("main").innerHTML = '<p class="estado">No se pudo cargar la tienda. Revisa tu conexión y recarga la página.</p>';
  }
}

iniciar();
