/* ═══════════════════════════════════════════════════════════════════════
   AGENDA & RECEPCIÓN

   tablaAgenda() es genérica: la usan tanto esta pantalla como Peluquería
   (peluqueria.js) y el resumen de Bienvenida, pasándole cuál de las dos
   agendas mostrar (BD.agenda o BD.agendaPeluqueria).
   ═══════════════════════════════════════════════════════════════════════ */

const CLASE_ESTADO_AGENDA = {
  Finalizado: "cerrado", Atendiendo: "estable", "En espera": "delicado",
  Confirmada: "box", "No asiste": "critico",
};
const ESTADOS_AGENDA = ["Confirmada", "En espera", "Atendiendo", "Finalizado", "No asiste"];

/* Recepción puede tocar el estado de cualquier agenda. En Peluquería,
   además, el estado queda editable para quien la esté mirando (así el
   peluquero puede pasarlo a "Atendiendo" o "Finalizado" sin depender de
   recepción) — en Agenda (médicos) sigue de solo lectura. "clave" dice
   de qué agenda viene la fila (BD.agenda o BD.agendaPeluqueria), así una
   sola función sirve para las dos y el cambio se guarda aunque la tabla
   muestre solo un pedazo (como en Bienvenida). */
function tablaAgenda(lista, clave) {
  if (!lista.length) return `<div class="vacio">Sin atenciones agendadas.</div>`;
  const puedeEditar = SESION.rol === "recepcion" || clave === "agendaPeluqueria";
  /* En Agenda (médicos) cada turno tiene un botón directo a "Nueva
     consulta", con el paciente, el tutor y el servicio ya rellenados —
     así se ingresa una mascota desde acá mismo, sin pasar por otro lado.
     No aplica a Peluquería: ahí no hay ficha clínica que abrir. */
  const conAccion = clave === "agenda";
  return `<div style="overflow-x:auto"><table>
    <thead><tr><th>Hora</th><th>Paciente</th><th>Servicio</th><th>Profesional</th><th>Estado</th>${conAccion ? "<th></th>" : ""}</tr></thead>
    <tbody>${lista.map(a => {
      const idx = BD[clave].indexOf(a);
      return `<tr>
      <td>${a.hora}</td>
      <td><b>${esc(a.paciente)}</b><div style="font-size:11.5px;color:var(--gris-cl)">${esc(a.tutor)}</div></td>
      <td>${esc(a.servicio)}</td>
      <td>${esc(a.profesional)}</td>
      <td>${puedeEditar
        ? `<select onchange="cambiarEstadoTurno('${clave}', ${idx}, this.value)" style="font-size:12.5px;padding:5px 8px;border-radius:7px;border:1px solid var(--linea)">
            ${ESTADOS_AGENDA.map(e => `<option ${e === a.estado ? "selected" : ""}>${e}</option>`).join("")}
          </select>`
        : `<span class="chip c-${CLASE_ESTADO_AGENDA[a.estado] || "cerrado"}">${esc(a.estado)}</span>`}</td>
      ${conAccion ? `<td><button class="bot linea chico" data-paciente="${esc(a.paciente)}" data-tutor="${esc(a.tutor)}" data-motivo="${esc(a.servicio)}"
          onclick="nuevaConsultaDesdeTurno(this.dataset.paciente, this.dataset.tutor, this.dataset.motivo)">Nueva consulta</button></td>` : ""}
    </tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

function cambiarEstadoTurno(clave, idx, valor) {
  BD[clave][idx].estado = valor;
  anotar();
}

/* Cada médico entra viendo solo sus propios turnos de hoy (comparando
   el nombre de su perfil con el campo "profesional" del turno);
   recepción, al ser quien coordina a todos, parte viendo la agenda
   completa. El botón de acá arriba deja cambiar de vista en cualquier
   momento — null significa "todavía no la tocó", así que se usa el
   default según el rol. */
let _agendaSoloMia = null;
function agendaSoloMia() {
  return _agendaSoloMia === null ? SESION.rol !== "recepcion" : _agendaSoloMia;
}
function alternarAgendaSoloMia() {
  _agendaSoloMia = !agendaSoloMia();
  pintar();
}

function verAgenda() {
  const r = reloj();
  const soloMia = agendaSoloMia();
  const lista = soloMia ? BD.agenda.filter(a => a.profesional === SESION.nombre) : BD.agenda;
  return `
    <div class="encab">
      <div><h2>Agenda &amp; recepción</h2><div class="sub">${lista.length} ${lista.length === 1 ? "atención agendada" : "atenciones agendadas"} hoy${soloMia ? " · las tuyas" : ""} · ${r.fecha}</div></div>
      <button class="bot linea chico" onclick="alternarAgendaSoloMia()">${soloMia ? "Ver agenda completa" : "Ver solo la mía"}</button>
    </div>

    <div class="panel">
      <h3>Hoy</h3>
      ${tablaAgenda(lista, "agenda")}
    </div>

    ${panelPorAvisar(clientesPorAvisar())}

    <div class="sello-demo">Esta agenda todavía es de ejemplo — no hay un calendario de verdad detrás.
      Cuando se agregue, esta misma pantalla se llena sola.</div>`;
}
