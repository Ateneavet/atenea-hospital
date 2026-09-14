/* ═══════════════════════════════════════════════════════════════════════
   CONSULTAS

   La ficha de una atención común — no depende de Hospital ni ocupa una
   jaula. Cualquiera del equipo la abre y la llena completa, de principio
   a fin, sin tener que esperar a que otra persona ingrese antes al
   paciente. Si la consulta termina en hospitalización, eso se hace
   aparte, en Hospital → "+ Ingresar paciente".
   ═══════════════════════════════════════════════════════════════════════ */

function verConsultas() {
  const lista = [...BD.consultas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return `
    <div class="encab">
      <div>
        <h2>Consultas</h2>
        <div class="sub">${lista.length} ${lista.length === 1 ? "consulta registrada" : "consultas registradas"}</div>
      </div>
      <button class="bot" onclick="ir('nuevaConsulta')">+ Nueva consulta</button>
    </div>
    ${lista.length ? `<div class="lista">${lista.map(c => `
      <button class="tarjeta" onclick="ir('detalleConsulta', ${c.id})">
        <div class="tira t-cerrado"></div>
        <div class="adentro">
          <div class="fila1">
            <h3>${esc(c.nombre)}</h3>
            <span class="chip c-box">${fecha(c.fecha)}</span>
          </div>
          <div class="meta">${[c.especie, c.raza, c.tutor].filter(Boolean).map(esc).join(" · ") || "—"}</div>
          <div class="motivo">${esc(c.motivo || "Sin motivo de consulta registrado")}</div>
          <div class="pie"><div><span>Atendió</span><b>${esc(c.quien)}</b></div></div>
        </div>
      </button>`).join("")}</div>`
      : `<div class="panel"><div class="vacio">Todavía no hay consultas registradas.</div></div>`}`;
}

/* ── Formulario (sirve para crear y para editar) ──────────────────── */

const OPCIONES_ESTERILIZADO = ["Sí", "No", "No sabe"];

function verNuevaConsulta() {
  const c = abierto ? BD.consultas.find(x => x.id === abierto) : null;
  const v = campo => esc(c?.[campo] ?? "");

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
              <select name="especie">
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
      <button class="bot claro" onclick="ir('nuevaConsulta', ${c.id})">Editar</button>
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
