/* ═══════════════════════════════════════════════════════════════════════
   HOSPITAL — la lista de hospitalizados, los boxes, y el ciclo de vida
   de un paciente: ingreso, traslado, alta.

   Lo que pasa adentro de la ficha de un paciente ya internado (controles,
   fármacos, exámenes, cargos) vive en ficha.js, no acá.
   ═══════════════════════════════════════════════════════════════════════ */

const ORDEN = { critico: 0, delicado: 1, estable: 2 };

function verHospital() {
  const lista = [...hospitalizados()].sort((a, b) =>
    (ORDEN[a.estado] - ORDEN[b.estado]) || (new Date(a.ingreso) - new Date(b.ingreso)));

  const criticos = lista.filter(p => p.estado === "critico").length;

  return `
    <div class="encab">
      <div>
        <h2>Hospitalizados</h2>
        <div class="sub">${lista.length} ${lista.length === 1 ? "paciente" : "pacientes"} adentro${
          criticos ? ` · ${criticos} en estado crítico` : ""}</div>
      </div>
      <button class="bot" onclick="ventanaIngreso()">+ Ingresar paciente</button>
    </div>
    ${lista.length ? `<div class="lista">${lista.map(tarjeta).join("")}</div>`
      : `<div class="panel"><div class="vacio">No hay pacientes hospitalizados.</div></div>`}`;
}

function tarjeta(p) {
  const ev = ultimoEvento(p);
  const aviso = ultimoAvisoTutor(p);
  const mudo = !aviso || horas(aviso.cuando) > 24;

  return `
    <button class="tarjeta" onclick="ir('ficha', ${p.id})">
      <div class="tira t-${p.estado}"></div>
      <div class="adentro">
        <div class="fila1">
          <h3>${esc(p.nombre)}</h3>
          <span class="chip c-${p.estado}">${NOMBRE_ESTADO[p.estado]}</span>
          <span class="chip c-box">${esc(p.box)}</span>
        </div>
        <div class="meta">${esc(p.especie)} · ${esc(p.raza)} · ${esc(p.edad)} · ${esc(p.peso)}</div>
        <div class="motivo">${esc(p.motivo)}</div>
        <div class="pie">
          <div><span>Lleva</span><b>${dias(p.ingreso)} ${dias(p.ingreso) === 1 ? "día" : "días"}</b></div>
          <div><span>Último control</span><b>${ev ? desde(ev.cuando) : "sin controles"}</b></div>
          <div><span>Cuenta</span><b>${plata(cuenta(p))}</b></div>
        </div>
        ${mudo ? `<div class="aviso-tutor">Al tutor no se le avisa nada ${
          aviso ? desde(aviso.cuando).replace("hace", "hace ya") : "desde el ingreso"}</div>` : ""}
      </div>
    </button>`;
}

/* ── Boxes ────────────────────────────────────────────────────────── */

function verBoxes() {
  const ocupados = hospitalizados();
  const libres = CLINICA.boxes.filter(b => !ocupados.some(p => p.box === b)).length;

  return `
    <div class="encab">
      <div>
        <h2>Boxes & horarios</h2>
        <div class="sub">${libres} ${libres === 1 ? "disponible" : "disponibles"} de ${CLINICA.boxes.length}, en las tres áreas del hospital</div>
      </div>
    </div>
    ${CLINICA.areas.map(a => {
      const libresArea = a.jaulas.filter(b => !ocupados.some(p => p.box === b)).length;
      return `
      <h3 style="font-size:15px;margin:18px 0 10px">${esc(a.area)}
        <span style="font-weight:400;color:var(--gris);font-size:12.5px"> · ${libresArea} de ${a.jaulas.length} disponibles</span></h3>
      <div class="boxes">
        ${a.jaulas.map(b => {
          const p = ocupados.find(x => x.box === b);
          return `<div class="box ${p ? "ocupado" : ""}"${p ? ` onclick="ir('ficha',${p.id})" style="cursor:pointer"` : ""}>
            <div class="n">Jaula ${b.split("Jaula ")[1]}</div>
            <div class="q">${p ? `${esc(p.nombre)}<br><span class="chip c-${p.estado}" style="margin-top:6px">${
              NOMBRE_ESTADO[p.estado]}</span>` : "Libre"}</div>
          </div>`;
        }).join("")}
      </div>`;
    }).join("")}
    </div>`;
}

function opcionesBox(actual) {
  const tomados = hospitalizados().filter(p => p.box !== actual).map(p => p.box);
  return CLINICA.areas.map(a => `<optgroup label="${esc(a.area)}">${
    a.jaulas.map(b => {
      const ocupado = tomados.includes(b);
      return `<option value="${esc(b)}" ${b === actual ? "selected" : ""} ${ocupado ? "disabled" : ""}>Jaula ${
        b.split("Jaula ")[1]}${ocupado ? " — ocupada" : ""}</option>`;
    }).join("")
  }</optgroup>`).join("");
}

/* ── Historial ────────────────────────────────────────────────────── */

function verHistorial() {
  const lista = [...egresados()].sort((a, b) => new Date(b.egreso) - new Date(a.egreso));
  return `
    <div class="encab">
      <div>
        <h2>Historial</h2>
        <div class="sub">Pacientes que ya salieron</div>
      </div>
    </div>
    ${lista.length ? `<div class="lista">${lista.map(p => `
      <button class="tarjeta" onclick="ir('ficha', ${p.id})">
        <div class="tira t-cerrado"></div>
        <div class="adentro">
          <div class="fila1">
            <h3>${esc(p.nombre)}</h3>
            <span class="chip c-cerrado">${esc(p.desenlace)}</span>
          </div>
          <div class="meta">${esc(p.especie)} · ${esc(p.tutor)}</div>
          <div class="motivo">${esc(p.motivo)}</div>
          <div class="pie">
            <div><span>Estuvo</span><b>${dias(p.ingreso, p.egreso)} días</b></div>
            <div><span>Salió</span><b>${fecha(p.egreso)}</b></div>
            <div><span>Cuenta final</span><b>${plata(cuenta(p))}</b></div>
          </div>
        </div>
      </button>`).join("")}</div>`
    : `<div class="panel"><div class="vacio">Todavía no hay pacientes egresados.</div></div>`}`;
}

/* ── Ingreso ──────────────────────────────────────────────────────── */

function ventanaIngreso() {
  ventana(`
    <h3>Ingresar paciente</h3>
    <div class="aclara">Los datos que faltan se completan después, en la ficha.</div>
    <form onsubmit="guardarIngreso(event)">
      <div class="dupla">
        <label class="campo"><span>Nombre</span><input name="nombre" required></label>
        <label class="campo"><span>Especie</span>
          <select name="especie"><option>Canina</option><option>Felina</option><option>Otra</option></select></label>
      </div>
      <div class="dupla">
        <label class="campo"><span>Raza</span><input name="raza" placeholder="Mestiza"></label>
        <label class="campo"><span>Edad</span><input name="edad" placeholder="4 años"></label>
      </div>
      <div class="dupla">
        <label class="campo"><span>Peso</span><input name="peso" placeholder="18,4 kg"></label>
        <label class="campo"><span>Box</span><select name="box">${opcionesBox(null)}</select></label>
      </div>
      <label class="campo"><span>Motivo de ingreso</span>
        <input name="motivo" required placeholder="Obstrucción uretral"></label>
      <div class="dupla">
        <label class="campo"><span>Tutor</span><input name="tutor" placeholder="Sr. Peña"></label>
        <label class="campo"><span>Teléfono</span>
          <input name="telefono" inputmode="tel" placeholder="+56 9 …"></label>
      </div>
      <label class="campo"><span>Estado al ingreso</span>
        <select name="estado">${opcionesEstado("delicado")}</select></label>
      <div class="botones">
        <button class="bot" type="submit">Ingresar</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
    </form>`);
}

async function guardarIngreso(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const t = k => (f.get(k) || "").trim();
  const { data: p, error } = await sb.from("pacientes").insert({
    nombre: t("nombre"), especie: t("especie"),
    raza: t("raza") || "Sin registrar", edad: t("edad") || "Sin registrar",
    peso: t("peso") || "Sin registrar", tutor: t("tutor") || "Sin registrar",
    telefono: t("telefono") || "Sin registrar", motivo: t("motivo"),
    box: t("box"), estado: t("estado"),
  }).select().single();
  if (error) { alert("No se pudo ingresar al paciente.\n\n" + error.message); return; }
  cerrar();
  await cargarPacientesDesdeSupabase();
  ir("ficha", p.id);
}

/* ── Traslado ─────────────────────────────────────────────────────── */

function ventanaTraslado(id) {
  const p = paciente(id);
  ventana(`
    <h3>Cambiar de box a ${esc(p.nombre)}</h3>
    <div class="aclara">Hoy está en ${esc(p.box)}.</div>
    <form onsubmit="guardarTraslado(event, ${id})">
      <label class="campo"><span>Nuevo box</span>
        <select name="box">${opcionesBox(p.box)}</select></label>
      <div class="botones">
        <button class="bot" type="submit">Trasladar</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
    </form>`);
}

async function guardarTraslado(e, id) {
  e.preventDefault();
  const p = paciente(id);
  const antes = p.box;
  const nuevoBox = new FormData(e.target).get("box");
  if (nuevoBox !== antes) {
    await sb.from("pacientes").update({ box: nuevoBox }).eq("id", id);
    await sb.from("eventos").insert({
      paciente_id: id, quien: BD.usuario, texto: `Trasladado de ${antes} a ${nuevoBox}.`,
    });
  }
  cerrar();
  await cargarPacientesDesdeSupabase();
}

/* ── Finalizar hospitalización (alta) ─────────────────────────────────
   Es la acción que ya no se puede deshacer, así que además del formulario
   pide una confirmación aparte (confirm() nativo) antes de cerrar la
   ficha — para que a nadie se le escape un clic de más. Al terminar,
   entra directo al detalle de cuenta, listo para imprimir y mostrarle al
   tutor en el mesón. */

const DESENLACES = ["Alta médica", "Alta a petición del tutor", "Derivación", "Fallecimiento", "Eutanasia"];

function ventanaAlta(id) {
  const p = paciente(id);
  ventana(`
    <h3>Finalizar hospitalización de ${esc(p.nombre)}</h3>
    <div class="aclara">Queda ${dias(p.ingreso)} ${dias(p.ingreso) === 1 ? "día" : "días"} de hospitalización
      y una cuenta de <b>${plata(cuenta(p))}</b>. Después de esto la ficha se guarda en el historial
      y ya no se le pueden cargar insumos.</div>
    <form onsubmit="guardarAlta(event, ${id})">
      <label class="campo"><span>Desenlace</span>
        <select name="desenlace">${DESENLACES.map(d => `<option>${d}</option>`).join("")}</select></label>
      <label class="campo"><span>Nota de cierre</span>
        <textarea name="texto" required placeholder="Se va caminando, herida seca. Control en 7 días."></textarea></label>
      <div class="botones">
        <button class="bot" type="submit">Finalizar hospitalización</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
    </form>`);
}

async function guardarAlta(e, id) {
  e.preventDefault();
  const f = new FormData(e.target);
  const p = paciente(id);
  const desenlace = f.get("desenlace");
  if (!confirm(`¿Confirmas finalizar la hospitalización de ${p.nombre}?\n\nDesenlace: ${desenlace}\nCuenta final: ${plata(cuenta(p))}\n\nEsto no se puede deshacer.`)) return;
  const egreso = new Date().toISOString();
  const { error } = await sb.from("pacientes").update({ egreso, desenlace }).eq("id", id);
  if (error) { alert("No se pudo finalizar la hospitalización.\n\n" + error.message); return; }
  await sb.from("eventos").insert({
    paciente_id: id, quien: BD.usuario, texto: `${desenlace}. ${f.get("texto").trim()}`,
  });
  cerrar();
  await cargarPacientesDesdeSupabase();
  ir("detalle", id);
}

/* ── Detalle de cuenta ────────────────────────────────────────────────
   Lo que se le muestra e imprime al tutor al retirar a su mascota: no
   reemplaza la boleta (esa la emite el POS de la clínica), es el
   desglose de qué se le cobró y por qué. Se imprime con window.print();
   el CSS de impresión (estilo.css) esconde el menú y deja solo esto. */

function verDetalle() {
  const p = paciente(abierto);
  if (!p) return verHospital();

  const filas = p.cargos.map(c => {
    const it = buscarItem(c.item);
    const precio = it?.precio || 0;
    return { nombre: it?.nombre || c.item, cantidad: c.cantidad, precio, subtotal: precio * c.cantidad };
  });
  const total = filas.reduce((s, f) => s + f.subtotal, 0);
  const iva = desgloseIva(total);

  return `
    <div class="encab no-imprimir">
      <div>
        <button class="bot linea chico" onclick="ir('${p.egreso ? "historial" : "ficha"}', ${p.id})">‹ Volver</button>
        <h2 style="margin-top:10px">Detalle de cuenta</h2>
      </div>
      <button class="bot" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    </div>

    <div class="panel detalle-cuenta">
      <div class="adentro">
        <div class="detalle-encab">
          <div>
            <h2>${esc(CLINICA.nombre)}</h2>
            <div class="sub">${esc(CLINICA.sub)}</div>
            ${CLINICA.direccion ? `<div class="sub">${esc(CLINICA.direccion)}</div>` : ""}
            ${CLINICA.telefono ? `<div class="sub">${esc(CLINICA.telefono)}</div>` : ""}
          </div>
          <div class="sub">Emitido ${fecha(new Date().toISOString())}</div>
        </div>

        <div class="rejilla" style="margin:18px 0">
          ${[["Paciente", `${p.nombre} · ${p.especie}${p.raza ? " · " + p.raza : ""}`],
             ["Tutor", p.tutor], ["Motivo de ingreso", p.motivo],
             ["Ingreso", fecha(p.ingreso)], ["Egreso", p.egreso ? fecha(p.egreso) : "—"],
             ["Días de hospitalización", dias(p.ingreso, p.egreso)],
             ...(p.desenlace ? [["Desenlace", p.desenlace]] : [])]
            .map(([e, v]) => `<div class="dato"><div class="e">${e}</div><div class="v">${esc(v)}</div></div>`).join("")}
        </div>

        <table>
          <thead><tr><th>Detalle</th><th class="num">Cant.</th><th class="num">Precio unit.</th><th class="num">Subtotal</th></tr></thead>
          <tbody>
            ${filas.length ? filas.map(f => `<tr>
              <td>${esc(f.nombre)}</td><td class="num">${f.cantidad}</td>
              <td class="num">${plata(f.precio)}</td><td class="num">${plata(f.subtotal)}</td>
            </tr>`).join("") : `<tr><td colspan="4">Sin cargos registrados.</td></tr>`}
          </tbody>
        </table>
        <div class="resumen-iva">
          <div><span>Neto</span><span>${plata(iva.neto)}</span></div>
          <div><span>IVA (19%, incluido)</span><span>${plata(iva.iva)}</span></div>
        </div>
        <div class="total"><span>Total</span><span>${plata(total)}</span></div>

        <div class="detalle-nota">Este documento es un detalle informativo de la atención. La boleta se emite aparte, en caja. Precios finales, IVA incluido.</div>
      </div>
    </div>`;
}
