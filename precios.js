/* ═══════════════════════════════════════════════════════════════════════
   LISTA DE PRECIOS

   El catálogo que Hospital usa para cobrar (fármacos, procedimientos,
   insumos) — acá cualquiera del equipo lo edita solo, sin depender de
   Luna. Vive en Supabase (tabla "catalogo") y se comparte en vivo, igual
   que Hospital: si Norely sube un precio desde el computador, al doctor
   que está cargando un insumo en la ficha le va a aparecer el precio
   nuevo sin que tenga que recargar nada.
   ═══════════════════════════════════════════════════════════════════════ */

function verListaPrecios() {
  return `
    <div class="encab">
      <div>
        <h2>Lista de precios</h2>
        <div class="sub">${CATALOGO_PLANO.length} ${CATALOGO_PLANO.length === 1 ? "ítem" : "ítems"} · lo que se cobra en Hospital</div>
      </div>
      <button class="bot" onclick="ventanaAgregarItem()">+ Agregar ítem</button>
    </div>

    ${CATALOGO.length ? CATALOGO.map(g => `
      <div class="panel">
        <h3>${esc(g.grupo)}</h3>
        <div class="adentro">
          ${g.items.map(i => `
            <div style="padding:9px 0;border-bottom:1px solid var(--linea-2);display:flex;justify-content:space-between;align-items:center;gap:10px">
              <div>${esc(i.nombre)}</div>
              <div style="display:flex;align-items:center;gap:10px">
                <b style="font-variant-numeric:tabular-nums">${plata(i.precio)}</b>
                <button class="bot linea chico" onclick="ventanaEditarItem('${i.id}')">Editar</button>
              </div>
            </div>`).join("")}
        </div>
      </div>`).join("") : `<div class="panel"><div class="vacio">Todavía no hay ítems cargados.</div></div>`}`;
}

function opcionesGrupoCatalogo(actual) {
  const grupos = [...new Set([...ORDEN_GRUPOS_CATALOGO, ...CATALOGO.map(g => g.grupo)])];
  return grupos.map(g => `<option value="${esc(g)}" ${g === actual ? "selected" : ""}>${esc(g)}</option>`).join("")
    + `<option value="__nuevo__">Otra (escribir nueva)…</option>`;
}

/* Un id de texto estable a partir del nombre (sin tildes, en minúscula,
   con guiones) — es lo que queda guardado en cada cargo, así que tiene
   que existir siempre y no repetirse nunca. */
function generarIdItem(nombre) {
  const base = nombre.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
  let id = base, n = 2;
  while (buscarItem(id)) { id = `${base}-${n}`; n++; }
  return id;
}

function ventanaAgregarItem() {
  ventana(`
    <h3>Agregar ítem a la lista de precios</h3>
    <div class="aclara">Va a quedar disponible al tiro para cargarlo en cualquier ficha de Hospital.</div>
    <form onsubmit="guardarNuevoItem(event)">
      <label class="campo"><span>Nombre</span>
        <input name="nombre" required placeholder="Ej: Sonda nasogástrica"></label>
      <label class="campo"><span>Grupo</span>
        <select name="grupo" onchange="mostrarGrupoNuevo(this)">${opcionesGrupoCatalogo(null)}</select></label>
      <label class="campo oculto-grupo-nuevo oculto"><span>Nombre del grupo nuevo</span>
        <input name="grupoNuevo" placeholder="Ej: Traumatología"></label>
      <label class="campo"><span>Precio</span>
        <input name="precio" type="number" min="0" step="1" required placeholder="15000"></label>
      <div class="botones">
        <button class="bot" type="submit">Agregar</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
    </form>`);
}

function mostrarGrupoNuevo(select) {
  const campo = document.querySelector(".oculto-grupo-nuevo");
  campo.classList.toggle("oculto", select.value !== "__nuevo__");
}

async function guardarNuevoItem(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const nombre = f.get("nombre").trim();
  const grupo = f.get("grupo") === "__nuevo__" ? f.get("grupoNuevo").trim() : f.get("grupo");
  const precio = Math.max(0, parseInt(f.get("precio"), 10) || 0);
  if (!nombre || !grupo) return;
  const { error } = await sb.from("catalogo").insert({ id: generarIdItem(nombre), nombre, grupo, precio });
  if (error) { alert("No se pudo agregar el ítem.\n\n" + error.message); return; }
  cerrar();
  await cargarCatalogoDesdeSupabase();
}

function ventanaEditarItem(id) {
  const i = buscarItem(id);
  if (!i) return;
  ventana(`
    <h3>Editar ítem</h3>
    <form onsubmit="guardarEdicionItem(event, '${id}')">
      <label class="campo"><span>Nombre</span>
        <input name="nombre" required value="${esc(i.nombre)}"></label>
      <label class="campo"><span>Grupo</span>
        <select name="grupo" onchange="mostrarGrupoNuevo(this)">${opcionesGrupoCatalogo(i.grupo)}</select></label>
      <label class="campo oculto-grupo-nuevo oculto"><span>Nombre del grupo nuevo</span>
        <input name="grupoNuevo" placeholder="Ej: Traumatología"></label>
      <label class="campo"><span>Precio</span>
        <input name="precio" type="number" min="0" step="1" required value="${i.precio}"></label>
      <div class="botones">
        <button class="bot" type="submit">Guardar cambios</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
      <div class="botones" style="margin-top:13px;padding-top:13px;border-top:1px solid var(--linea-2)">
        <button class="bot peligro chico" type="button" onclick="borrarItem('${id}')">Quitar de la lista</button>
      </div>
    </form>`);
}

async function guardarEdicionItem(e, id) {
  e.preventDefault();
  const f = new FormData(e.target);
  const nombre = f.get("nombre").trim();
  const grupo = f.get("grupo") === "__nuevo__" ? f.get("grupoNuevo").trim() : f.get("grupo");
  const precio = Math.max(0, parseInt(f.get("precio"), 10) || 0);
  if (!nombre || !grupo) return;
  const { error } = await sb.from("catalogo").update({ nombre, grupo, precio }).eq("id", id);
  if (error) { alert("No se pudo guardar.\n\n" + error.message); return; }
  cerrar();
  await cargarCatalogoDesdeSupabase();
}

async function borrarItem(id) {
  const i = buscarItem(id);
  if (!i) return;
  if (!confirm(`¿Quitar "${i.nombre}" de la lista de precios?\n\nLos cargos que ya se hicieron con este ítem no se borran, solo deja de poder cargarse de nuevo.`)) return;
  const { error } = await sb.from("catalogo").delete().eq("id", id);
  if (error) { alert("No se pudo quitar.\n\n" + error.message); return; }
  cerrar();
  await cargarCatalogoDesdeSupabase();
}
