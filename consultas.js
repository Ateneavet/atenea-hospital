/* ═══════════════════════════════════════════════════════════════════════
   CONSULTAS

   La ficha de una atención común — no depende de Hospital ni ocupa una
   jaula. Cualquiera del equipo la abre y la llena completa, de principio
   a fin, sin tener que esperar a que otra persona ingrese antes al
   paciente. Si la consulta termina en hospitalización, eso se hace
   aparte, en Hospital → "+ Ingresar paciente".
   ═══════════════════════════════════════════════════════════════════════ */

const ESTADOS_CONSULTA = ["En espera", "Atendiendo", "Finalizado", "Reagendado", "Cancelada"];
const CLASE_ESTADO_CONSULTA = {
  "En espera": "delicado", "Atendiendo": "estable", "Finalizado": "cerrado",
  "Reagendado": "box", "Cancelada": "critico",
};

const horaTexto = iso => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const esHoy = iso => new Date(iso).toDateString() === new Date().toDateString();

async function cambiarEstadoConsulta(id, estado) {
  const { error } = await sb.from("consultas").update({ estado }).eq("id", id);
  if (error) { alert("No se pudo cambiar el estado.\n\n" + error.message); return; }
  await cargarConsultasDesdeSupabase();
}

/* Tabla al estilo de tablaAgenda(): la hora (o la fecha, para las
   anteriores) a la izquierda, filas de arriba hacia abajo en ese orden,
   y el estado editable al tocar de una vez, sin entrar a la ficha. */
function tablaConsultas(lista, conFecha) {
  if (!lista.length) return `<div class="vacio">Sin consultas${conFecha ? " anteriores" : " registradas hoy"}.</div>`;
  return `<div style="overflow-x:auto"><table>
    <thead><tr><th>${conFecha ? "Fecha" : "Hora"}</th><th>Paciente</th><th>Motivo</th><th>Atendió</th><th>Estado</th><th></th></tr></thead>
    <tbody>${lista.map(c => `<tr>
      <td>${conFecha ? fecha(c.fecha) : horaTexto(c.fecha)}</td>
      <td><b>${esc(c.nombre)}</b><div style="font-size:11.5px;color:var(--gris-cl)">${esc(c.tutor || "")}</div></td>
      <td>${esc(c.motivo || "—")}</td>
      <td>${esc(c.quien)}</td>
      <td><select onchange="cambiarEstadoConsulta(${c.id}, this.value)" style="font-size:12.5px;padding:5px 8px;border-radius:7px;border:1px solid var(--linea)">
        ${ESTADOS_CONSULTA.map(e => `<option ${e === (c.estado || "En espera") ? "selected" : ""}>${e}</option>`).join("")}
      </select></td>
      <td><button class="bot linea chico" onclick="ir('detalleConsulta', ${c.id})">Ver</button></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function verConsultas() {
  const hoy = BD.consultas.filter(c => esHoy(c.fecha)).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const anteriores = BD.consultas.filter(c => !esHoy(c.fecha)).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return `
    <div class="encab">
      <div>
        <h2>Consultas</h2>
        <div class="sub">${hoy.length} ${hoy.length === 1 ? "consulta hoy" : "consultas hoy"} · ${BD.consultas.length} en total</div>
      </div>
      <button class="bot" onclick="ir('nuevaConsulta')">+ Nueva consulta</button>
    </div>

    <div class="panel">
      <h3>Hoy</h3>
      ${tablaConsultas(hoy, false)}
    </div>

    ${anteriores.length ? `<div class="panel"><h3>Anteriores</h3>${tablaConsultas(anteriores, true)}</div>` : ""}`;
}

/* ── Formulario (sirve para crear y para editar) ──────────────────── */

const OPCIONES_ESTERILIZADO = ["Sí", "No", "No sabe"];

const VACUNAS_POR_ESPECIE = {
  Canina: ["Séxtuple", "Antirrábica", "KC (tos de las perreras)"],
  Felina: ["Triple felina", "Antirrábica", "Leucemia felina"],
  Otra: ["Antirrábica"],
};
const opcionesVacunaEspecie = especie =>
  (VACUNAS_POR_ESPECIE[especie] || VACUNAS_POR_ESPECIE.Otra).map(nom => `<option>${esc(nom)}</option>`).join("");
function actualizarOpcionesVacuna(especie) {
  const select = document.getElementById("selectVacuna");
  if (select) select.innerHTML = opcionesVacunaEspecie(especie);
}

/* El botón "Nueva consulta" de un turno en Agenda deja el paciente, el
   tutor y el motivo ya escritos acá, para no volver a teclearlos — se
   usa una sola vez y se borra, así no se le queda pegado a la próxima
   consulta que se abra desde el menú. */
let _prellenoConsulta = null;
function nuevaConsultaDesdeTurno(nombre, tutor, motivo) {
  _prellenoConsulta = { nombre, tutor, motivo };
  ir("nuevaConsulta");
}

function verNuevaConsulta() {
  const c = abierto ? BD.consultas.find(x => x.id === abierto) : null;
  const preset = c ? null : _prellenoConsulta;
  _prellenoConsulta = null;
  const v = campo => esc(c?.[campo] ?? preset?.[campo] ?? "");

  return `
    <div class="encab">
      <div>
        <button class="bot linea chico" onclick="ir('${c ? "detalleConsulta" : "consultas"}'${c ? `, ${c.id}` : ""})">‹ Volver</button>
        <h2 style="margin-top:10px">${c ? `Editar consulta de ${esc(c.nombre)}` : "Nueva consulta"}</h2>
      </div>
    </div>

    <form onsubmit="guardarConsulta(event${c ? `, ${c.id}` : ""})">
      <div class="panel">
        <h3>Datos del paciente</h3>
        <div class="adentro">
          <div class="dupla">
            <label class="campo"><span>Nombre</span><input name="nombre" required value="${v("nombre")}"></label>
            <label class="campo"><span>Especie</span>
              <select name="especie" onchange="actualizarOpcionesVacuna(this.value)">
                <option ${!c || c.especie === "Canina" ? "selected" : ""}>Canina</option>
                <option ${c?.especie === "Felina" ? "selected" : ""}>Felina</option>
                <option ${c?.especie === "Otra" ? "selected" : ""}>Otra</option>
              </select></label>
          </div>
          <div class="dupla">
            <label class="campo"><span>Raza</span><input name="raza" placeholder="Mestiza" value="${v("raza")}"></label>
            <label class="campo"><span>Edad</span><input name="edad" placeholder="4 años" value="${v("edad")}"></label>
          </div>
          <label class="campo"><span>Peso</span>
            <input name="peso" placeholder="18,4 kg" style="font-size:19px;font-weight:700" value="${v("peso")}"></label>
          <div class="dupla">
            <label class="campo"><span>Esterilizado</span>
              <select name="esterilizado">${OPCIONES_ESTERILIZADO.map(o =>
                `<option ${o === c?.esterilizado ? "selected" : ""}>${o}</option>`).join("")}</select></label>
            <label class="campo"><span>Convive con otras mascotas</span>
              <input name="conviveMascotas" placeholder="Sí, con un gato" value="${v("conviveMascotas")}"></label>
          </div>
          <label class="campo"><span>Enfermedades preexistentes</span>
            <textarea name="enfermedadesPrevias" placeholder="Ninguna conocida">${v("enfermedadesPrevias")}</textarea></label>
          <div class="dupla">
            <label class="campo"><span>Nombre tutor</span><input name="tutor" value="${v("tutor")}"></label>
            <label class="campo"><span>Teléfono</span><input name="telefono" inputmode="tel" placeholder="+56 9 …" value="${v("telefono")}"></label>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3>Consulta de hoy</h3>
        <div class="adentro">
          <label class="campo"><span>Motivo de consulta hoy</span>
            <input name="motivo" required placeholder="Vómitos hace 2 días" value="${v("motivo")}"></label>
          <label class="campo"><span>Anamnesis remota</span>
            <textarea name="anamnesisRemota" placeholder="Antecedentes de salud a lo largo de su vida">${v("anamnesisRemota")}</textarea></label>
          <label class="campo"><span>Anamnesis actual</span>
            <textarea name="anamnesisActual" placeholder="Cómo ha estado en los últimos días">${v("anamnesisActual")}</textarea></label>

          <div class="fila-signos">
            <label class="campo"><span>FC</span><input name="fc" placeholder="120 lpm" value="${v("fc")}"></label>
            <label class="campo"><span>FR</span><input name="fr" placeholder="30 rpm" value="${v("fr")}"></label>
            <label class="campo"><span>Temperatura</span><input name="temperatura" placeholder="38,2 °C" value="${v("temperatura")}"></label>
          </div>

          <label class="campo"><span>Examen físico</span><textarea name="examenFisico">${v("examenFisico")}</textarea></label>
          <label class="campo"><span>Prediagnósticos</span><textarea name="prediagnosticos">${v("prediagnosticos")}</textarea></label>
          <label class="campo"><span>Exámenes solicitados</span><textarea name="examenesSolicitados">${v("examenesSolicitados")}</textarea></label>
          <label class="campo"><span>Orden médica</span><textarea name="ordenMedica">${v("ordenMedica")}</textarea></label>
          <label class="campo"><span>Próxima consulta / control</span>
            <input name="proximoControl" placeholder="En 7 días, o según evolución" value="${v("proximoControl")}"></label>
        </div>
      </div>

      ${!c ? `
      <div class="panel">
        <h3>Vacunación</h3>
        <div class="adentro">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" name="vacuno" onchange="document.querySelector('.bloque-vacuna').classList.toggle('oculto', !this.checked)">
            <span>Se aplicó una vacuna hoy</span>
          </label>
          <div class="bloque-vacuna oculto" style="margin-top:12px">
            <div class="dupla">
              <label class="campo"><span>Vacuna</span>
                <select name="vacunaNombre" id="selectVacuna">${opcionesVacunaEspecie(preset?.especie || "Canina")}</select></label>
              <label class="campo"><span>Próxima dosis en</span>
                <select name="vacunaIntervalo">
                  <option value="1">1 mes</option><option value="3">3 meses</option>
                  <option value="6">6 meses</option><option value="12" selected>12 meses</option>
                  <option value="24">24 meses</option>
                </select></label>
            </div>
            <div class="aclara" style="color:var(--gris);font-size:12.5px;margin-top:-6px">
              Con esto se calcula sola la próxima fecha y aparece en Recordatorios cuando se acerque.</div>
          </div>
        </div>
      </div>` : ""}

      <div class="botones" style="margin-bottom:20px">
        <button class="bot" type="submit">${c ? "Guardar cambios" : "Guardar consulta"}</button>
        <button class="bot linea" type="button" onclick="ir('${c ? "detalleConsulta" : "consultas"}'${c ? `, ${c.id}` : ""})">Cancelar</button>
      </div>
    </form>`;
}

async function guardarConsulta(e, id) {
  e.preventDefault();
  const f = new FormData(e.target);
  const t = k => (f.get(k) || "").trim();
  const datos = {
    nombre: t("nombre"), especie: t("especie"), raza: t("raza"), edad: t("edad"), peso: t("peso"),
    esterilizado: t("esterilizado"), convive_mascotas: t("conviveMascotas"),
    enfermedades_previas: t("enfermedadesPrevias"), tutor: t("tutor"), telefono: t("telefono"),
    motivo: t("motivo"), anamnesis_remota: t("anamnesisRemota"), anamnesis_actual: t("anamnesisActual"),
    fc: t("fc"), fr: t("fr"), temperatura: t("temperatura"), examen_fisico: t("examenFisico"),
    prediagnosticos: t("prediagnosticos"), examenes_solicitados: t("examenesSolicitados"),
    orden_medica: t("ordenMedica"), proximo_control: t("proximoControl"),
  };
  const resultado = id
    ? await sb.from("consultas").update(datos).eq("id", id).select().single()
    : await sb.from("consultas").insert({ ...datos, quien: BD.usuario }).select().single();
  if (resultado.error) { alert("No se pudo guardar la consulta.\n\n" + resultado.error.message); return; }

  /* Solo al crear (no al editar, para no duplicar la dosis cada vez que
     se corrige algo): si se marcó "Se aplicó una vacuna hoy", calcula la
     próxima fecha (hoy + los meses elegidos) y la deja guardada — de ahí
     sale sola en Recordatorios cuando se acerque. */
  if (!id && f.get("vacuno")) {
    const vacunaNombre = t("vacunaNombre");
    const meses = parseInt(f.get("vacunaIntervalo"), 10) || 12;
    const hoyFecha = new Date();
    const proxima = new Date(hoyFecha);
    proxima.setMonth(proxima.getMonth() + meses);
    const aFecha = d => d.toISOString().slice(0, 10);
    const { error: errVacuna } = await sb.from("vacunas_aplicadas").insert({
      consulta_id: resultado.data.id, paciente: datos.nombre, tutor: datos.tutor,
      telefono: datos.telefono, especie: datos.especie, vacuna: vacunaNombre,
      fecha_aplicada: aFecha(hoyFecha), proxima_fecha: aFecha(proxima), quien: BD.usuario,
    });
    if (errVacuna) alert("La consulta se guardó, pero no se pudo registrar la vacuna.\n\n" + errVacuna.message);
    else await cargarVacunasDesdeSupabase();
  }

  await cargarConsultasDesdeSupabase();
  ir("detalleConsulta", resultado.data.id);
}

/* ── Detalle ──────────────────────────────────────────────────────── */

function verDetalleConsulta() {
  const c = BD.consultas.find(x => x.id === abierto);
  if (!c) return verConsultas();

  const bloque = (etiqueta, valor) => `
    <div class="panel"><h3>${etiqueta}</h3><div class="adentro">${
      valor ? `<p style="white-space:pre-wrap;margin:0">${esc(valor)}</p>` : `<div class="vacio">Sin registrar.</div>`}</div></div>`;

  return `
    <div class="encab">
      <div>
        <button class="bot linea chico" onclick="ir('consultas')">‹ Volver</button>
        <h2 style="margin-top:10px">${esc(c.nombre)}</h2>
        <div class="sub">${fecha(c.fecha)} · Atendió ${esc(c.quien)}</div>
      </div>
      <div class="botones">
        <select onchange="cambiarEstadoConsulta(${c.id}, this.value)" style="padding:9px 12px;border-radius:9px;border:1px solid var(--linea)">
          ${ESTADOS_CONSULTA.map(e => `<option ${e === (c.estado || "En espera") ? "selected" : ""}>${e}</option>`).join("")}
        </select>
        <button class="bot claro" onclick="ir('nuevaConsulta', ${c.id})">Editar</button>
      </div>
    </div>

    <div class="panel">
      <h3>Datos del paciente</h3>
      <div class="adentro">
        <div class="rejilla" style="margin-bottom:14px">
          <div class="dato"><div class="e">Peso</div><div class="v" style="font-size:22px">${esc(c.peso || "—")}</div></div>
        </div>
        <div class="rejilla">
          ${[["Especie", c.especie], ["Raza", c.raza], ["Edad", c.edad], ["Esterilizado", c.esterilizado],
             ["Tutor", c.tutor], ["Teléfono", c.telefono], ["Convive con otras mascotas", c.conviveMascotas],
             ["Enfermedades preexistentes", c.enfermedadesPrevias]]
            .map(([et, val]) => `<div class="dato"><div class="e">${et}</div><div class="v">${esc(val || "—")}</div></div>`).join("")}
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>Signos vitales</h3>
      <div class="adentro">
        <div class="rejilla">
          ${[["FC", c.fc], ["FR", c.fr], ["Temperatura", c.temperatura]]
            .map(([et, val]) => `<div class="dato"><div class="e">${et}</div><div class="v">${esc(val || "—")}</div></div>`).join("")}
        </div>
      </div>
    </div>

    ${bloque("Motivo de consulta hoy", c.motivo)}
    ${bloque("Anamnesis remota", c.anamnesisRemota)}
    ${bloque("Anamnesis actual", c.anamnesisActual)}
    ${bloque("Examen físico", c.examenFisico)}
    ${bloque("Prediagnósticos", c.prediagnosticos)}
    ${bloque("Exámenes solicitados", c.examenesSolicitados)}
    ${bloque("Orden médica", c.ordenMedica)}
    ${bloque("Próxima consulta / control", c.proximoControl)}`;
}
