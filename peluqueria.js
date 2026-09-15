/* ═══════════════════════════════════════════════════════════════════════
   PELUQUERÍA

   Mismo formato que Agenda & recepción (reutiliza tablaAgenda(), definida
   en agenda.js) más una lista de precios propia y un registro de cobros
   real — este último sí vive en Supabase (cobros_peluqueria), porque de
   ahí sale la parte de Peluquería en Finanzas.
   ═══════════════════════════════════════════════════════════════════════ */

function verPeluqueria() {
  const r = reloj();
  const cobrosHoy = BD.cobrosPeluqueria.filter(c => esHoy(c.fecha)).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return `
    <div class="encab">
      <div><h2>Peluquería</h2><div class="sub">${BD.agendaPeluqueria.length} turnos agendados hoy · ${r.fecha}</div></div>
      <button class="bot" onclick="ventanaCobroPeluqueria()">+ Registrar cobro</button>
    </div>

    <div class="panel">
      <h3>Hoy</h3>
      ${tablaAgenda(BD.agendaPeluqueria, "agendaPeluqueria")}
    </div>

    <div class="panel">
      <h3>Cobros de hoy<span style="font-weight:400;color:var(--gris);font-size:12.5px">${
        cobrosHoy.length} ${cobrosHoy.length === 1 ? "cobro" : "cobros"}</span></h3>
      <div class="adentro">
        ${cobrosHoy.length ? cobrosHoy.map(c => `
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--linea-2)">
            <div><b>${esc(c.paciente)}</b>
              <span style="color:var(--gris);font-size:12.5px"> · ${esc(c.servicio)}${c.tutor ? " · " + esc(c.tutor) : ""}</span></div>
            <b style="font-variant-numeric:tabular-nums">${plata(c.monto)}</b>
          </div>`).join("") : `<div class="vacio">Sin cobros registrados hoy.</div>`}
      </div>
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
      confirmar con la clínica los servicios y las tarifas reales. Los cobros que registres acá sí son
      de verdad y quedan sumados en Finanzas.</div>`;
}

function ventanaCobroPeluqueria() {
  ventana(`
    <h3>Registrar cobro de peluquería</h3>
    <form onsubmit="guardarCobroPeluqueria(event)">
      <label class="campo"><span>Paciente</span><input name="paciente" required placeholder="Nombre de la mascota"></label>
      <label class="campo"><span>Tutor</span><input name="tutor" placeholder="Opcional"></label>
      <label class="campo"><span>Servicio</span>
        <select name="servicio" onchange="autocompletarMontoPeluqueria(this)">
          ${SERVICIOS_PELUQUERIA.map(s => `<option value="${esc(s.nombre)}" data-precio="${s.precio}">${esc(s.nombre)}</option>`).join("")}
        </select></label>
      <label class="campo"><span>Monto</span>
        <input name="monto" type="number" min="0" step="1" required value="${SERVICIOS_PELUQUERIA[0].precio}"></label>
      <div class="botones">
        <button class="bot" type="submit">Registrar</button>
        <button class="bot linea" type="button" onclick="cerrar()">Cancelar</button>
      </div>
    </form>`);
}

function autocompletarMontoPeluqueria(select) {
  const precio = select.selectedOptions[0]?.dataset.precio;
  const campoMonto = document.querySelector('input[name="monto"]');
  if (precio && campoMonto) campoMonto.value = precio;
}

async function guardarCobroPeluqueria(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const { error } = await sb.from("cobros_peluqueria").insert({
    paciente: f.get("paciente").trim(), tutor: f.get("tutor").trim() || null,
    servicio: f.get("servicio"), monto: Math.max(0, parseInt(f.get("monto"), 10) || 0),
    quien: BD.usuario,
  });
  if (error) { alert("No se pudo registrar el cobro.\n\n" + error.message); return; }
  cerrar();
  await cargarCobrosPeluqueriaDesdeSupabase();
}
