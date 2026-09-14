/* ═══════════════════════════════════════════════════════════════════════
   PELUQUERÍA

   Mismo formato que Agenda & recepción (reutiliza tablaAgenda(), definida
   en agenda.js) más una lista de precios propia.
   ═══════════════════════════════════════════════════════════════════════ */

function verPeluqueria() {
  const r = reloj();
  return `
    <div class="encab">
      <div><h2>Peluquería</h2><div class="sub">${BD.agendaPeluqueria.length} turnos agendados hoy · ${r.fecha}</div></div>
    </div>

    <div class="panel">
      <h3>Hoy</h3>
      ${tablaAgenda(BD.agendaPeluqueria, "agendaPeluqueria")}
    </div>

    <div class="panel">
      <h3>Servicios &amp; precios</h3>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Servicio</th><th class="num">Precio</th></tr></thead>
        <tbody>${SERVICIOS_PELUQUERIA.map(s => `<tr>
          <td>${esc(s.nombre)}</td><td class="num">${plata(s.precio)}</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>

    <div class="sello-demo">Los turnos y los precios de peluquería son de ejemplo — hay que
      confirmar con la clínica los servicios y las tarifas reales.</div>`;
}
