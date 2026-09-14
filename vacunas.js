/* ═══════════════════════════════════════════════════════════════════════
   VACUNAS APLICADAS Y RECORDATORIOS

   Cuando en una Consulta se marca que se aplicó una vacuna, queda
   guardada acá con su próxima fecha (hoy + los meses que corresponda).
   Este archivo junta a quienes tienen una vacuna vencida o por vencer en
   los próximos 30 días, para que recepción los llame antes de que se
   pierdan — lo usan Bienvenida, Agenda y Recordatorios.

   OJO: esto es distinto de clientesEjemplo() / estadoVacuna() en
   datos.js, que son los diez clientes de ejemplo de la pantalla
   "Clientes & pacientes" — esa sigue siendo una maqueta, todavía no
   conectada a datos reales.
   ═══════════════════════════════════════════════════════════════════════ */

const DIAS_AVISO_VACUNA = 30;

function estadoVacunaAplicada(v) {
  const dias = Math.ceil((new Date(v.proximaFecha) - new Date()) / 86400000);
  if (dias < 0) return "vencida";
  if (dias <= DIAS_AVISO_VACUNA) return "por-vencer";
  return "vigente";
}

function vacunasPorAvisar() {
  return BD.vacunas
    .filter(v => !v.avisado && estadoVacunaAplicada(v) !== "vigente")
    .sort((a, b) => new Date(a.proximaFecha) - new Date(b.proximaFecha));
}

function linkWhatsapp(telefono, mensaje) {
  const numero = (telefono || "").replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function mensajeRecordatorioVacuna(v) {
  const nombreTutor = (v.tutor || "").split(" ")[0] || "";
  const dias = Math.abs(Math.ceil((new Date(v.proximaFecha) - new Date()) / 86400000));
  const cuando = estadoVacunaAplicada(v) === "vencida"
    ? `se le venció hace ${dias} ${dias === 1 ? "día" : "días"}`
    : `se le vence en ${dias} ${dias === 1 ? "día" : "días"}`;
  return `Hola ${nombreTutor}, te escribimos de ${CLINICA.nombre} 🐾. A ${v.paciente} ${cuando} la vacuna ${v.vacuna}. ¿Quieres que te agendemos una hora?`;
}

async function marcarVacunaAvisada(id) {
  const { error } = await sb.from("vacunas_aplicadas").update({ avisado: true }).eq("id", id);
  if (error) { alert("No se pudo marcar como avisada.\n\n" + error.message); return; }
  await cargarVacunasDesdeSupabase();
}

function panelRecordatorios(lista, limite) {
  const items = limite ? lista.slice(0, limite) : lista;
  return `
    <div class="panel">
      <h3>Por avisar<span style="font-weight:400;color:var(--gris);font-size:12.5px">${
        lista.length} ${lista.length === 1 ? "vacuna" : "vacunas"}</span></h3>
      <div class="adentro">
        ${items.length ? items.map(v => `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;
                      padding:10px 0;border-bottom:1px solid var(--linea-2)">
            <div>
              <b>${esc(v.paciente)}</b> <span style="color:var(--gris);font-size:12.5px">· ${esc(v.tutor || "—")}</span>
              <div style="font-size:12.5px;color:var(--gris);margin-top:2px">${esc(v.vacuna)}
                <span class="chip c-${estadoVacunaAplicada(v) === "vencida" ? "critico" : "delicado"}" style="margin-left:5px">${
                  estadoVacunaAplicada(v) === "vencida" ? "Vencida" : "Por vencer"}</span></div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
              <a class="bot claro chico" style="text-decoration:none;white-space:nowrap" target="_blank" rel="noopener"
                 href="${linkWhatsapp(v.telefono, mensajeRecordatorioVacuna(v))}">WhatsApp</a>
              <button class="bot linea chico" onclick="marcarVacunaAvisada(${v.id})">Ya avisé</button>
            </div>
          </div>`).join("")
        : `<div class="vacio">Nadie por avisar — todo al día.</div>`}
        ${lista.length > items.length ? `<button class="bot linea chico" style="margin-top:12px" onclick="ir('recordatorios')">Ver las ${lista.length} →</button>` : ""}
      </div>
    </div>`;
}

function verRecordatorios() {
  const lista = vacunasPorAvisar();
  return `
    <div class="encab">
      <div>
        <h2>Recordatorios</h2>
        <div class="sub">${lista.length} ${lista.length === 1 ? "vacuna por avisar" : "vacunas por avisar"}</div>
      </div>
    </div>
    ${panelRecordatorios(lista)}
    <div class="sello-demo">Esto se arma solo: cuando en una Consulta se marca "Se aplicó una vacuna hoy",
      el sistema calcula la próxima fecha y la trae para acá ${DIAS_AVISO_VACUNA} días antes de que se cumpla.</div>`;
}
