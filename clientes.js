/* ═══════════════════════════════════════════════════════════════════════
   CLIENTES & PACIENTES

   Se arma sola con las vacunas registradas en Consultas (BD.vacunas) —
   un paciente por cada nombre+tutor distinto, con todas sus vacunas
   agrupadas. Ordenada por urgencia (estadoVacunaAplicada/linkWhatsapp
   vienen de vacunas.js). "Copiar correos" junta los que se hayan dejado
   al registrar una vacuna — es el primer paso hacia la base de correos
   para promociones.
   ═══════════════════════════════════════════════════════════════════════ */

function clientesDesdeVacunas() {
  const mapa = new Map();
  BD.vacunas.forEach(v => {
    const clave = `${v.paciente}__${v.tutor || ""}`;
    if (!mapa.has(clave)) {
      mapa.set(clave, { nombre: v.paciente, tutor: v.tutor || "—", telefono: v.telefono || "",
        especie: v.especie || "", email: null, vacunas: [] });
    }
    const cliente = mapa.get(clave);
    cliente.vacunas.push(v);
    if (v.email && !cliente.email) cliente.email = v.email;
  });
  return [...mapa.values()];
}

const proximaVacuna = c => [...c.vacunas].sort((a, b) => new Date(a.proximaFecha) - new Date(b.proximaFecha))[0];

function verClientes() {
  const clientes = clientesDesdeVacunas();
  const conEmail = clientes.filter(c => c.email);
  const ordenados = [...clientes].sort((a, b) => new Date(proximaVacuna(a).proximaFecha) - new Date(proximaVacuna(b).proximaFecha));

  return `
    <div class="encab">
      <div>
        <h2>Clientes &amp; pacientes</h2>
        <div class="sub">${clientes.length} ${clientes.length === 1 ? "paciente" : "pacientes"} con vacunas registradas</div>
      </div>
      <button class="bot claro" onclick="copiarCorreos()">Copiar correos para promoción (${conEmail.length})</button>
    </div>

    ${clientes.length ? `<div class="panel">
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Paciente</th><th>Tutor</th><th>Contacto</th><th>Vacunas</th><th></th></tr></thead>
        <tbody>${ordenados.map(c => {
          const proxima = proximaVacuna(c);
          return `<tr>
            <td><b>${esc(c.nombre)}</b><div style="font-size:11.5px;color:var(--gris-cl)">${esc(c.especie)}</div></td>
            <td>${esc(c.tutor)}</td>
            <td style="font-size:12.5px;color:var(--gris)">${esc(c.telefono)}${c.email ? `<br>${esc(c.email)}` : ""}</td>
            <td>${c.vacunas.map(v => {
              const e = estadoVacunaAplicada(v);
              return `<span class="chip c-${e === "vencida" ? "critico" : e === "por-vencer" ? "delicado" : "estable"}"
                style="margin:1px;display:inline-block">${esc(v.vacuna)}</span>`;
            }).join(" ")}</td>
            <td class="num"><a class="bot linea chico" style="text-decoration:none;white-space:nowrap" target="_blank" rel="noopener"
              href="${linkWhatsapp(c.telefono, mensajeRecordatorioVacuna(proxima))}">WhatsApp</a></td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
    </div>` : `<div class="panel"><div class="vacio">Todavía no hay ninguna vacuna registrada desde Consultas.</div></div>`}

    <div class="sello-demo">Esta lista sale sola de las vacunas que se van registrando en Consultas — todavía no
      incluye pacientes sin ninguna vacuna aplicada. El correo se deja al marcar "Se aplicó una vacuna hoy" y sirve
      para armar campañas de promoción — cirugías, exámenes de sangre, lo que se quiera ofrecer por temporada.</div>`;
}

function copiarCorreos() {
  const correos = clientesDesdeVacunas().filter(c => c.email).map(c => c.email);
  if (!correos.length) { alert("Ningún cliente tiene correo registrado todavía."); return; }
  const texto = correos.join(", ");
  const avisar = () => alert(`Se copiaron ${correos.length} correos. Pégalos en el "CCO" de tu correo para mandar la promoción.`);
  if (navigator.clipboard) navigator.clipboard.writeText(texto).then(avisar, () => alert(texto));
  else alert(texto);
}
