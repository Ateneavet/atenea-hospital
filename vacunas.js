/* ═══════════════════════════════════════════════════════════════════════
   VACUNAS: quién está por avisar y cómo escribirle

   El médico pone una vacuna y, si nadie vuelve a avisar, ese cliente se
   pierde. Esto junta a todos los que tienen algo vencido o por vencer,
   ordenados por urgencia, con el WhatsApp listo para mandar.

   Lo usan Bienvenida, Agenda y Clientes — por eso vive en su propio
   archivo en vez de adentro de cualquiera de esas pantallas.
   ═══════════════════════════════════════════════════════════════════════ */

function clientesPorAvisar() {
  return BD.clientes
    .map(c => ({ c, v: peorVacuna(c) }))
    .filter(x => estadoVacuna(x.v) !== "vigente")
    .sort((a, b) => new Date(a.v.proxima) - new Date(b.v.proxima));
}

function linkWhatsapp(telefono, mensaje) {
  const numero = telefono.replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function mensajeVacuna(c, v) {
  const nombreTutor = c.tutor.split(" ")[0];
  const dias = Math.abs(Math.ceil((new Date(v.proxima) - new Date()) / 86400000));
  const cuando = estadoVacuna(v) === "vencida"
    ? `se le venció hace ${dias} ${dias === 1 ? "día" : "días"}`
    : `se le vence en ${dias} ${dias === 1 ? "día" : "días"}`;
  return `Hola ${nombreTutor}, te escribimos de ${CLINICA.nombre} 🐾. A ${c.nombre} ${cuando} la vacuna ${v.nombre}. ¿Quieres que te agendemos una hora?`;
}

function panelPorAvisar(lista, limite) {
  const items = limite ? lista.slice(0, limite) : lista;
  return `
    <div class="panel">
      <h3>Por avisar<span style="font-weight:400;color:var(--gris);font-size:12.5px">${
        lista.length} ${lista.length === 1 ? "cliente" : "clientes"}</span></h3>
      <div class="adentro">
        ${items.length ? items.map(({ c, v }) => `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;
                      padding:10px 0;border-bottom:1px solid var(--linea-2)">
            <div>
              <b>${esc(c.nombre)}</b> <span style="color:var(--gris);font-size:12.5px">· ${esc(c.tutor)}</span>
              <div style="font-size:12.5px;color:var(--gris);margin-top:2px">${esc(v.nombre)}
                <span class="chip c-${estadoVacuna(v) === "vencida" ? "critico" : "delicado"}" style="margin-left:5px">${
                  estadoVacuna(v) === "vencida" ? "Vencida" : "Por vencer"}</span></div>
            </div>
            <a class="bot claro chico" style="text-decoration:none;white-space:nowrap" target="_blank" rel="noopener"
               href="${linkWhatsapp(c.telefono, mensajeVacuna(c, v))}">WhatsApp</a>
          </div>`).join("")
        : `<div class="vacio">Nadie por avisar — todo al día.</div>`}
        ${lista.length > items.length ? `<button class="bot linea chico" style="margin-top:12px" onclick="ir('clientes')">Ver los ${lista.length} →</button>` : ""}
      </div>
    </div>`;
}
