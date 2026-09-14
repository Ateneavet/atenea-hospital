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

/* Solo recepción puede tocar el estado de una agenda — a los médicos y
   al peluquero les queda de solo lectura. "clave" dice de qué agenda
   viene la fila (BD.agenda o BD.agendaPeluqueria), así una sola función
   sirve para las dos y el cambio se guarda aunque la tabla muestre solo
   un pedazo (como en Bienvenida). */
function tablaAgenda(lista, clave) {
  if (!lista.length) return `<div class="vacio">Sin atenciones agendadas.</div>`;
  const puedeEditar = SESION.rol === "recepcion";
  return `<div style="overflow-x:auto"><table>
    <thead><tr><th>Hora</th><th>Paciente</th><th>Servicio</th><th>Profesional</th><th>Estado</th></tr></thead>
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
    </tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

function cambiarEstadoTurno(clave, idx, valor) {
  BD[clave][idx].estado = valor;
  anotar();
}

function verAgenda() {
  const r = reloj();
  return `
    <div class="encab">
      <div><h2>Agenda &amp; recepción</h2><div class="sub">${BD.agenda.length} atenciones agendadas hoy · ${r.fecha}</div></div>
    </div>

    <div class="panel">
      <h3>Hoy</h3>
      ${tablaAgenda(BD.agenda, "agenda")}
    </div>

    ${panelPorAvisar(clientesPorAvisar())}

    <div class="sello-demo">Esta agenda todavía es de ejemplo — no hay un calendario de verdad detrás.
      Cuando se agregue, esta misma pantalla se llena sola.</div>`;
}
