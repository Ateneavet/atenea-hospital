/* ═══════════════════════════════════════════════════════════════════════
   FICHA — todo lo que pasa adentro de un paciente ya hospitalizado:
   la evolución, los fármacos del día (lo más importante), los exámenes,
   y los cargos manuales (hospitalización, procedimientos, insumos).

   La cuenta ya no se muestra acá — vive en Caja. Lo que sí queda es el
   cargo, asociado al paciente, para cuando esa sección se construya.
   ═══════════════════════════════════════════════════════════════════════ */

function verFicha() {
  const p = paciente(abierto);
  if (!p) return verHospital();
  const dentro = !p.egreso;

  return `
    <div class="encab">
      <div>
        <button class="bot linea chico" onclick="ir('${dentro ? "hospital" : "historial"}')">‹ Volver</button>
        <h2 style="margin-top:10px">${esc(p.nombre)}
          <span class="chip c-${dentro ? p.estado : "cerrado"}" style="vertical-align:middle;font-size:12.5px">${
            dentro ? NOMBRE_ESTADO[p.estado] : esc(p.desenlace)}</span></h2>
        <div class="sub">${esc(p.motivo)}</div>
      </div>
      <div class="botones">
        ${dentro ? `
          <button class="bot" onclick="ventanaControl(${p.id})">Registrar control</button>
          <button class="bot claro" onclick="ventanaCargo(${p.id})">Cargar insumo</button>
        ` : `<button class="bot claro" onclick="ir('detalle', ${p.id})">🖨️ Ver / imprimir detalle de cuenta</button>`}
      </div>
    </div>

    <div class="panel">
      <h3>Datos<span style="font-weight:400;color:var(--gris);font-size:12.5px">
        Ingresó ${fecha(p.ingreso)}${p.egreso ? ` · Egresó ${fecha(p.egreso)}` : ""}</span></h3>
      <div class="adentro">
        <div class="rejilla">
          ${[["Especie", p.especie], ["Raza", p.raza], ["Edad", p.edad], ["Peso", p.peso],
             ["Box", p.box], ["Días adentro", dias(p.ingreso, p.egreso)],
             ["Tutor", p.tutor], ["Teléfono", p.telefono]]
            .map(([e, v]) => `<div class="dato"><div class="e">${e}</div><div class="v">${esc(v)}</div></div>`).join("")}
        </div>
      </div>
    </div>

    ${verFarmacos(p)}

    <div class="ficha-cols">
      <div>
        <div class="panel">
          <h3>Evolución<span style="font-weight:400;color:var(--gris);font-size:12.5px">${
            p.eventos.length} ${p.eventos.length === 1 ? "control" : "controles"}</span></h3>
          ${p.eventos.length ? [...p.eventos].reverse().map(e => `
            <div class="evento">
              <div class="cab">
                <b>${esc(e.quien)}</b>
                <span>${fecha(e.cuando)} · ${desde(e.cuando)}${e.temp ? ` · T° ${esc(e.temp)}` : ""}</span>
              </div>
              <p>${esc(e.texto)}</p>
              ${e.tutor ? `<div class="tutor"><b>Se le dijo al tutor</b>${esc(e.tutor)}</div>` : ""}
            </div>`).join("") : `<div class="vacio">Todavía no hay controles anotados.</div>`}
        </div>
      </div>

      <div>
        ${verExamenes(p)}

        ${dentro ? `<div class="panel"><div class="adentro">
          <div class="botones">
            <button class="bot linea" onclick="ventanaTraslado(${p.id})">Cambiar de box</button>
            <button class="bot linea" onclick="ventanaAlta(${p.id})">Finalizar hospitalización</button>
          </div>
        </div></div>` : ""}
      </div>
    </div>`;
}

/* ── Control de turno ─────────────────────────────────────────────── */

/* Lo que más se usa. Un solo formulario corto que anota la evolución,
   actualiza el estado y deja constancia de lo que se le dijo al tutor. */
function ventanaControl(id) {
  const p = paciente(id);
  ventana(`
    <h3>Control de ${esc(p.nombre)}</h3>
    <div class="aclara">Queda firmado como <b>${esc(BD.usuario)}</b> a esta hora.</div>
    <form onsubmit="guardarControl(event, ${id})">
      <div class="dupla">
        <label class="campo"><span>Estado ahora</span>
          <select name="estado">${opcionesEstado(p.estado)}</select></label>
        <label class="campo"><span>Temperatura</span>
          <input name="temp" inputmode="decimal" placeholder="38.2"></label>
      </div>
      <label class="campo"><span>Cómo está</span>
        <textarea name="texto" required placeholder="Comió, no vomitó, herida limpia…"></textarea></label>
      <label class="campo"><span>Qué se le dijo al tutor (si se le habló)</span>
        <textarea name="tutor" placeholder="Se puede dejar en blanco"></textarea></label>
      <div class="botones">
        <button class="bot" type="submit">Guardar control</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
    </form>`);
}

async function guardarControl(e, id) {
  e.preventDefault();
  const f = new FormData(e.target);
  const { error } = await sb.from("pacientes").update({ estado: f.get("estado") }).eq("id", id);
  if (error) { alert("No se pudo guardar el control.\n\n" + error.message); return; }
  await sb.from("eventos").insert({
    paciente_id: id, quien: BD.usuario,
    temp: f.get("temp").trim() || null,
    texto: f.get("texto").trim(),
    tutor: f.get("tutor").trim() || null,
  });
  cerrar();
  await cargarPacientesDesdeSupabase();
}

/* ── Fármacos del día ─────────────────────────────────────────────
   Lo más importante de la ficha: qué fármaco corresponde y si ya se le
   dio o no, hora por hora. Cada casilla marcada como administrada suma
   sola a la cuenta del paciente — esa cuenta ya no se muestra acá, vive
   en Caja, pero el cargo queda igual de registrado. */

function fechaHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fechaLarga(f) {
  const [y, m, d] = f.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

const administracion = (p, farmacoId, hora) =>
  (p.administraciones || []).find(a => a.farmacoId === farmacoId && a.fecha === fechaHoy() && a.hora === hora);

/* "horas" es cada cuántas horas corresponde la dosis — con eso se pinta
   roja la casilla que toca en la grilla. SOS no tiene periodicidad fija
   (horas: null), así que nunca se pinta roja: se marca solo cuando se da,
   a criterio de quien atiende. */
const FRECUENCIAS_FARMACO = [
  { texto: "Cada 4 horas", horas: 4 },
  { texto: "Cada 6 horas", horas: 6 },
  { texto: "Cada 8 horas", horas: 8 },
  { texto: "Cada 12 horas", horas: 12 },
  { texto: "Cada 24 horas", horas: 24 },
  { texto: "SOS (a necesidad)", horas: null },
];

const horasFrecuencia = texto => FRECUENCIAS_FARMACO.find(fr => fr.texto === texto)?.horas ?? null;

/* La hora de inicio del esquema es la hora en que se ingresó el fármaco
   (f.agregado), tomada en punto — así "cada 4 horas" desde las 14:37
   corresponde a las 14, 18, 22... Cruza la medianoche sin problema porque
   se compara con la fecha completa, no solo con el número de hora. */
function anclaFarmaco(f) {
  const d = new Date(f.agregado);
  d.setMinutes(0, 0, 0);
  return d;
}

/* ¿La hora "h" de HOY es una de las que corresponde según la frecuencia,
   contando desde que se ingresó el fármaco? No se pinta roja una hora
   anterior al ingreso, ni una vez que se cumplieron los días del
   tratamiento. */
function correspondeFarmaco(f, h) {
  const frecuenciaHoras = horasFrecuencia(f.frecuencia);
  if (!frecuenciaHoras) return false;
  const ancla = anclaFarmaco(f);
  const hoy = new Date();
  const columna = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), h, 0, 0, 0);
  if (columna < ancla) return false;
  if (f.dias) {
    const fin = new Date(ancla);
    fin.setHours(fin.getHours() + f.dias * 24);
    if (columna >= fin) return false;
  }
  const horasTranscurridas = Math.round((columna - ancla) / 3600000);
  return horasTranscurridas % frecuenciaHoras === 0;
}

/* La dosis se anota en mg/kg — nunca la dosis total — y acá se calcula
   sola contra el peso real del paciente. Así nadie tiene que multiplicar
   a mano ni puede anotar por error la dosis total en vez de la de por kg. */
function dosisTexto(p, f) {
  if (!f.dosisMgKg) return "";
  const peso = pesoKg(p);
  const total = peso
    ? `${(f.dosisMgKg * peso).toLocaleString("es-CL", { maximumFractionDigits: 2 })} mg totales`
    : "sin peso registrado para calcular el total";
  return `${f.dosisMgKg} mg/kg → ${total}`;
}

function verFarmacos(p) {
  const filas = p.farmacos || [];
  const hoy = fechaHoy();
  const horaActual = new Date().getHours();
  const dentro = !p.egreso;

  return `
    <div class="panel">
      <h3>Fármacos del día<span style="font-weight:400;color:var(--gris);font-size:12.5px">${fechaLarga(hoy)}</span></h3>
      <div class="adentro">
        ${filas.length ? `<div style="display:flex;gap:14px;align-items:center;margin-bottom:8px;font-size:11.5px;color:var(--gris)">
          <span><span class="celda-hora corresponde" style="display:inline-block;width:12px;height:12px;vertical-align:middle;border-radius:3px"></span> Corresponde ahora</span>
          <span><span class="celda-hora marcada" style="display:inline-block;width:12px;height:12px;vertical-align:middle;border-radius:3px"></span> Administrado</span>
          <span>Doble clic para marcar o deshacer</span>
        </div>
        <div style="overflow-x:auto">
          <table class="grilla-farmacos">
            <thead><tr><th>Fármaco</th>${
              Array.from({ length: 24 }, (_, h) =>
                `<th class="${h === horaActual ? "ahora" : ""}">${String(h).padStart(2, "0")}</th>`).join("")
            }</tr></thead>
            <tbody>${filas.map(f => {
              const it = buscarItem(f.item);
              const info = [dosisTexto(p, f), f.frecuencia, f.dias ? `por ${f.dias} ${f.dias === 1 ? "día" : "días"}` : ""]
                .filter(Boolean).join(" · ");
              return `<tr>
                <td><div>${esc(it?.nombre || f.item)}${dentro ? `
                  <button class="quitar-fila" onclick="quitarFarmaco(${p.id},${f.id})" title="Quitar fármaco">✕</button>` : ""}</div>
                  ${info ? `<div style="color:var(--gris);font-size:11.5px;font-weight:400">${esc(info)}</div>` : ""}</td>
                ${Array.from({ length: 24 }, (_, h) => {
                  const marcada = !!administracion(p, f.id, h);
                  const corresponde = !marcada && correspondeFarmaco(f, h);
                  return `<td class="celda-hora ${marcada ? "marcada" : corresponde ? "corresponde" : ""}"${
                    dentro ? ` ondblclick="marcarFarmaco(${p.id},${f.id},${h})" title="Doble clic para ${marcada ? "deshacer" : "marcar como administrado"}"` : ""}></td>`;
                }).join("")}
              </tr>`;
            }).join("")}</tbody>
          </table>
        </div>` : `<div class="vacio">Sin fármacos programados todavía.</div>`}
        ${dentro ? `<button class="bot claro chico" style="margin-top:12px"
          onclick="ventanaAgregarFarmaco(${p.id})">+ Agregar fármaco</button>` : ""}
      </div>
    </div>`;
}

async function marcarFarmaco(idPac, farmacoId, hora) {
  const p = paciente(idPac);
  const existente = administracion(p, farmacoId, hora);
  if (existente) {
    await sb.from("administraciones").delete().eq("id", existente.id);
    if (existente.cargoId) await sb.from("cargos").delete().eq("id", existente.cargoId);
  } else {
    const f = (p.farmacos || []).find(x => x.id === farmacoId);
    if (!f) return;
    const { data: cargo, error } = await sb.from("cargos")
      .insert({ paciente_id: idPac, item: f.item, cantidad: 1, quien: BD.usuario }).select().single();
    if (error) { alert("No se pudo marcar el fármaco.\n\n" + error.message); return; }
    await sb.from("administraciones").insert({
      farmaco_id: farmacoId, paciente_id: idPac, fecha: fechaHoy(), hora,
      quien: BD.usuario, cargo_id: cargo.id,
    });
  }
  await cargarPacientesDesdeSupabase();
}

async function quitarFarmaco(idPac, farmacoId) {
  const p = paciente(idPac);
  const f = (p.farmacos || []).find(x => x.id === farmacoId);
  if (!f) return;
  if (!confirm(`¿Quitar "${buscarItem(f.item)?.nombre}" de la grilla de ${p.nombre}?\n\nSe borran también las horas ya marcadas hoy.`)) return;
  const idsCargos = (p.administraciones || []).filter(a => a.farmacoId === farmacoId).map(a => a.cargoId).filter(Boolean);
  if (idsCargos.length) await sb.from("cargos").delete().in("id", idsCargos);
  await sb.from("farmacos").delete().eq("id", farmacoId);
  await cargarPacientesDesdeSupabase();
}

function ventanaAgregarFarmaco(idPac) {
  const p = paciente(idPac);
  const grupoMedicamentos = CATALOGO.find(g => g.grupo === "Medicamentos");
  const peso = pesoKg(p);
  ventana(`
    <h3>Agregar fármaco</h3>
    <div class="aclara">Va a quedar disponible para marcar hora por hora, hoy y los días que vengan.
      ${peso ? ` El peso registrado de ${esc(p.nombre)} es <b>${peso} kg</b> — con eso se calcula la dosis total.`
             : ` <b>${esc(p.nombre)} no tiene un peso numérico registrado</b> (dice "${esc(p.peso)}"), así que no se va a poder calcular la dosis total en mg.`}
    </div>
    <form onsubmit="guardarFarmaco(event, ${idPac})">
      <label class="campo"><span>Fármaco</span>
        <select name="item" required>
          ${grupoMedicamentos.items.map(i => `<option value="${i.id}">${esc(i.nombre)}</option>`).join("")}
        </select></label>
      <div class="dupla">
        <label class="campo"><span>Dosis (mg/kg)</span>
          <input name="dosisMgKg" type="number" min="0" step="0.01" required placeholder="5"></label>
        <label class="campo"><span>Frecuencia</span>
          <select name="frecuencia" required>${FRECUENCIAS_FARMACO.map(fr => `<option value="${esc(fr.texto)}">${esc(fr.texto)}</option>`).join("")}</select></label>
      </div>
      <label class="campo"><span>Por cuántos días</span>
        <input name="dias" type="number" min="1" step="1" required placeholder="5"></label>
      <label class="campo checkbox"><input type="checkbox" name="administradoAhora">
        <span>Ya se le administró ahora, a las ${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}</span></label>
      <div class="botones">
        <button class="bot" type="submit">Agregar</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
    </form>`);
}

async function guardarFarmaco(e, idPac) {
  e.preventDefault();
  const f = new FormData(e.target);
  const item = f.get("item");
  const administradoAhora = f.get("administradoAhora") === "on";
  const { data: farmaco, error } = await sb.from("farmacos").insert({
    paciente_id: idPac, item,
    dosis_mg_kg: parseFloat(f.get("dosisMgKg")) || null,
    frecuencia: f.get("frecuencia"),
    dias: parseInt(f.get("dias"), 10) || null,
  }).select().single();
  if (error) { alert("No se pudo agregar el fármaco.\n\n" + error.message); return; }

  if (administradoAhora) {
    const { data: cargo, error: errorCargo } = await sb.from("cargos")
      .insert({ paciente_id: idPac, item, cantidad: 1, quien: BD.usuario }).select().single();
    if (!errorCargo) {
      await sb.from("administraciones").insert({
        farmaco_id: farmaco.id, paciente_id: idPac, fecha: fechaHoy(), hora: new Date().getHours(),
        quien: BD.usuario, cargo_id: cargo.id,
      });
    }
  }
  cerrar();
  await cargarPacientesDesdeSupabase();
}

/* ── Exámenes ─────────────────────────────────────────────────────── */

function verExamenes(p) {
  const dentro = !p.egreso;
  const examenes = p.cargos.filter(c => buscarItem(c.item)?.grupo === "Exámenes e imágenes");
  return `
    <div class="panel">
      <h3>Exámenes<span style="font-weight:400;color:var(--gris);font-size:12.5px">${
        examenes.length} ${examenes.length === 1 ? "tomado" : "tomados"}</span></h3>
      <div class="adentro">
        ${examenes.length ? [...examenes].reverse().map(c => {
          const it = buscarItem(c.item);
          return `<div style="padding:8px 0;border-bottom:1px solid var(--linea-2);display:flex;justify-content:space-between;gap:8px">
            <div><b>${esc(it.nombre)}</b>
              <div style="color:var(--gris);font-size:12.5px">${fecha(c.cuando)} · ${esc(c.quien)}</div></div>
            ${dentro ? `<button class="bot linea chico" onclick="borrarCargo(${p.id},${c.id})" title="Borrar">✕</button>` : ""}
          </div>`;
        }).join("") : `<div class="vacio">Sin exámenes registrados.</div>`}
        ${dentro ? `<button class="bot claro chico" style="margin-top:12px"
          onclick="ventanaExamen(${p.id})">+ Registrar examen</button>` : ""}
      </div>
    </div>`;
}

function ventanaExamen(idPac) {
  const grupo = CATALOGO.find(g => g.grupo === "Exámenes e imágenes");
  ventana(`
    <h3>Registrar examen</h3>
    <form onsubmit="guardarCargo(event, ${idPac})">
      <label class="campo"><span>Examen</span>
        <select name="item" required>
          ${grupo.items.map(i => `<option value="${i.id}">${esc(i.nombre)}</option>`).join("")}
        </select></label>
      <input type="hidden" name="cantidad" value="1">
      <div class="botones">
        <button class="bot" type="submit">Registrar</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
    </form>`);
}

/* ── Cargos manuales ──────────────────────────────────────────────
   El motivo por el que la clínica deja de perder plata. Los fármacos y
   los exámenes tienen su propio botón — acá va todo lo demás:
   hospitalización, procedimientos e insumos. */

const GRUPOS_CARGO_MANUAL = ["Hospitalización", "Procedimientos", "Insumos"];

function ventanaCargo(id) {
  const p = paciente(id);
  ventana(`
    <h3>Cargar a ${esc(p.nombre)}</h3>
    <div class="aclara">Lo que no se anota acá, no se cobra al final.</div>
    <form onsubmit="guardarCargo(event, ${id})">
      <label class="campo"><span>Qué se usó</span>
        <select name="item" required>
          ${CATALOGO.filter(g => GRUPOS_CARGO_MANUAL.includes(g.grupo)).map(g => `<optgroup label="${esc(g.grupo)}">${
            g.items.map(i => `<option value="${i.id}">${esc(i.nombre)} — ${plata(i.precio)}</option>`).join("")
          }</optgroup>`).join("")}
        </select></label>
      <label class="campo"><span>Cantidad</span>
        <input name="cantidad" type="number" min="1" step="1" value="1" required></label>
      <div class="botones">
        <button class="bot" type="submit">Agregar a la cuenta</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
    </form>`);
}

async function guardarCargo(e, id) {
  e.preventDefault();
  const f = new FormData(e.target);
  await sb.from("cargos").insert({
    paciente_id: id, item: f.get("item"),
    cantidad: Math.max(1, parseInt(f.get("cantidad"), 10) || 1),
    quien: BD.usuario,
  });
  cerrar();
  await cargarPacientesDesdeSupabase();
}

async function borrarCargo(idPac, idCargo) {
  const p = paciente(idPac);
  const c = p.cargos.find(x => x.id === idCargo);
  if (!c) return;
  if (!confirm(`¿Borrar "${buscarItem(c.item)?.nombre}" de la cuenta de ${p.nombre}?`)) return;
  await sb.from("cargos").delete().eq("id", idCargo);
  await cargarPacientesDesdeSupabase();
}
