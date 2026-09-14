/* ═══════════════════════════════════════════════════════════════════════
   PANTALLA: BIENVENIDA — el inicio

   Un resumen de lo que hay hoy: hospitalizados, la agenda del día y a
   quién hay que avisarle de una vacuna. Todo lo que arma esta pantalla
   ya está calculado en otros archivos (hospital.js para los pacientes,
   agenda.js para la tabla de turnos, vacunas.js para "Por avisar").
   ═══════════════════════════════════════════════════════════════════════ */

function verBienvenida() {
  const lista = hospitalizados();
  const criticos = lista.filter(p => p.estado === "critico").length;
  const libres = CLINICA.boxes.filter(b => !lista.some(p => p.box === b)).length;
  const porAvisar = vacunasPorAvisar();
  const r = reloj();
  const partes = BD.usuario.split(" ");
  const primerNombre = ["Dr.", "Dra."].includes(partes[0]) ? partes[1] : partes[0];
  const agendaHoy = SESION.rol === "recepcion" ? BD.agenda : BD.agenda.filter(a => a.profesional === SESION.nombre);

  return `
    <div class="encab">
      <div>
        <h2>${r.saludo}, ${esc(primerNombre)}</h2>
        <div class="sub">Esto es lo que hay hoy en ${esc(CLINICA.nombre)} · ${r.fecha}</div>
      </div>
      <div class="reloj" id="reloj">${r.hora}</div>
    </div>

    <div class="tiles">
      <div class="tile"><div class="e">Hospitalizados</div><div class="v">${lista.length}</div></div>
      <div class="tile ${criticos ? "critico" : ""}"><div class="e">En estado crítico</div><div class="v">${criticos}</div></div>
      <div class="tile"><div class="e">Boxes libres</div><div class="v">${libres} / ${CLINICA.boxes.length}</div></div>
      <div class="tile ${porAvisar.length ? "critico" : ""}"><div class="e">Vacunas por avisar</div><div class="v">${porAvisar.length}</div></div>
    </div>

    <div class="ficha-cols">
      <div>
        <div class="panel">
          <h3>Hospital<span style="font-weight:400;color:var(--gris);font-size:12.5px">Módulo principal del sistema</span></h3>
          <div class="adentro">
            ${lista.length ? lista.filter(p => p.estado !== "estable").slice(0, 3).map(p => `
              <div style="margin-bottom:10px"><b>${esc(p.nombre)}</b>
                <span class="chip c-${p.estado}" style="margin-left:6px">${NOMBRE_ESTADO[p.estado]}</span>
                <span style="color:var(--gris);font-size:13px"> — ${esc(p.box)}</span></div>`).join("")
              || `<p style="margin:0;color:var(--gris)">Todos los hospitalizados están estables.</p>`
            : `<p style="margin:0;color:var(--gris)">No hay pacientes hospitalizados ahora mismo.</p>`}
            <button class="bot" style="margin-top:8px" onclick="ir('hospital')">Ir a Hospital →</button>
          </div>
        </div>

        <div class="panel">
          <h3>${SESION.rol === "recepcion" ? "Agenda de hoy" : "Tu agenda de hoy"}<span style="font-weight:400;color:var(--gris);font-size:12.5px">${agendaHoy.length} ${agendaHoy.length === 1 ? "atención" : "atenciones"}</span></h3>
          ${tablaAgenda(agendaHoy.slice(0, 5), "agenda")}
          <div class="adentro" style="padding-top:0"><button class="bot linea chico" onclick="ir('agenda')">Ver agenda completa →</button></div>
        </div>
      </div>

      <div>
        ${panelRecordatorios(porAvisar, 4)}
      </div>
    </div>`;
}
