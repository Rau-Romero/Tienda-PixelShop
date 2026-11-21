let items = []; // { p: producto, n: cantidad }

async function cargar() {
  const cesta = Cesta.leer(), ids = Object.keys(cesta);
  if (!ids.length) { items = []; return pintar(); }
  try {
    // Se vuelve a pedir cada producto para tener el stock real
    const prods = await Promise.all(ids.map(id => Api.producto(id).catch(() => null)));
    items = [];
    prods.forEach((p, i) => {
      const id = ids[i];
      if (!p || !p.id || Number(p.stock) <= 0) return Cesta.poner(id, 0); // ya no existe o se agotó
      const n = Math.min(cesta[id], Number(p.stock));
      if (n !== cesta[id]) Cesta.poner(id, n);
      items.push({ p, n });
    });
    pintar();
  } catch (e) {
    $("#contenido").innerHTML = '<p class="estado">No se pudo cargar la cesta. Recarga la página.</p>';
  }
}

function pintar() {
  if (!items.length) {
    $("#contenido").innerHTML = '<p class="estado">Tu cesta está vacía.</p><p class="centro"><a class="btn-hero" href="index.html">Seguir comprando</a></p>';
    return;
  }
  const total = items.reduce((a, { p, n }) => a + Number(p.precio) * n, 0);
  $("#contenido").innerHTML = `<div class="tabla-caja"><table>
    <thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead>
    <tbody>${items.map(({ p, n }) => `<tr>
      <td class="prod-cel"><img class="mini" src="${esc(portada(p))}" alt=""><span>${esc(p.nombre)}<br><span class="meta">Stock: ${esc(p.stock)}</span></span></td>
      <td>${euros(p.precio)}</td>
      <td><div class="cant">
        <button class="btn-mini" data-op="menos" data-id="${esc(p.id)}" aria-label="Quitar una unidad">−</button>
        <span>${n}</span>
        <button class="btn-mini" data-op="mas" data-id="${esc(p.id)}" aria-label="Añadir una unidad" ${n >= Number(p.stock) ? "disabled" : ""}>+</button>
      </div></td>
      <td>${euros(Number(p.precio) * n)}</td>
      <td><button class="btn-mini peligro" data-op="quitar" data-id="${esc(p.id)}">Quitar</button></td></tr>`).join("")}
    </tbody></table></div>
    <div class="resumen"><p>Total: <strong>${euros(total)}</strong></p><button class="btn" id="comprar">Finalizar compra</button></div>`;
}

async function comprar() {
  const btn = $("#comprar");
  btn.disabled = true;
  btn.textContent = "Procesando…";
  try {
    // 1. Releer el stock justo antes de comprar
    const frescos = await Promise.all(items.map(({ p }) => Api.producto(p.id)));
    if (items.some(({ n }, i) => !frescos[i].id || Number(frescos[i].stock) < n)) {
      toast("El stock cambió mientras comprabas. Revisa tu cesta.", true);
      return cargar();
    }
    // 2. Restar el stock de cada producto en MockAPI
    for (let i = 0; i < items.length; i++) {
      const { id, ...resto } = frescos[i];
      await Api.editar(id, { ...resto, stock: Number(resto.stock) - items[i].n });
    }
    // 3. Recibo
    const lineas = items.map(({ p, n }) => ({ nombre: p.nombre, n, sub: Number(p.precio) * n }));
    const total = lineas.reduce((a, l) => a + l.sub, 0);
    Cesta.vaciar();
    items = [];
    $("#contenido").innerHTML = `<div class="caja recibo">
      <h2>¡Gracias por tu compra!</h2>
      <p class="meta">Pedido n.º ${Math.floor(100000 + Math.random() * 900000)}. Hemos registrado tu pedido.</p>
      <ul>${lineas.map(l => `<li>${l.n} x ${esc(l.nombre)}: ${euros(l.sub)}</li>`).join("")}</ul>
      <p>Total: <strong>${euros(total)}</strong></p>
      <a class="btn-hero" href="index.html">Volver a la tienda</a></div>`;
  } catch (e) {
    toast("No se pudo completar la compra. Inténtalo de nuevo.", true);
    btn.disabled = false;
    btn.textContent = "Finalizar compra";
  }
}

$("#contenido").addEventListener("click", e => {
  const b = e.target.closest("button[data-op]");
  if (b) {
    const it = items.find(x => x.p.id === b.dataset.id), op = b.dataset.op;
    if (op === "mas") { if (it.n < Number(it.p.stock)) it.n++; }
    else if (op === "menos") it.n--;
    else it.n = 0;
    Cesta.poner(it.p.id, it.n);
    items = items.filter(x => x.n > 0);
    return pintar();
  }
  if (e.target.id === "comprar") comprar();
});

cargar();
