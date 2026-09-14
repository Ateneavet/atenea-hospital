/* ═══════════════════════════════════════════════════════════════════════
   CLIENTES & PACIENTES

   La lista completa de tutores y mascotas, ordenada por urgencia de
   vacuna (peorVacuna/estadoVacuna vienen de datos.js). "Copiar correos"
   es el primer paso hacia la base de correos para promociones.
   ═══════════════════════════════════════════════════════════════════════ */

function verClientes() {
  const conEmail = BD.clientes.filter(c => c.email);
  const ordenados = [...BD.clientes].sort((a, b) =>
    PESO_ESTADO_VACUNA[estadoVacuna(peorVacuna(a))] - PESO_ESTADO_VACUNA[estadoVacuna(peorVacuna(b))]);

  return `
    <div class="encab">
      <div><h2>Clientes &amp; pacientes</h2><div class="sub">${BD.clientes.length} clientes con vacunas registradas</div></div>
      <button class="bot claro" onclick="copiarCorreos()">Copiar correos para promoción (${conEmail.length})</button>
    </div>

    <div class="panel">
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Paciente</th><th>Tutor</th><th>Contacto</th><th>Vacunas</th><th></th></tr></thead>
        <tbody>${ordenados.map(c => {
          const peor = peorVacuna(c);
          return `<tr>
            <td><b>${esc(c.nombre)}</b><div style="font-size:11.5px;color:var(--gris-cl)">${esc(c.especie)}</div></td>
            <td>${esc(c.tutor)}</td>
            <td style="font-size:12.5px;color:var(--gris)">${esc(c.telefono)}${c.email ? `<br>${esc(c.email)}` : ""}</td>
            <td>${c.vacunas.map(v => {
              const e = estadoVacuna(v);
              return `<span class="chip c-${e === "vencida" ? "critico" : e === "por-vencer" ? "delicado" : "estable"}"
                style="margin:1px;display:inline-block">${esc(v.nombre)}</span>`;
            }).join(" ")}</td>
            <td class="num"><a class="bot linea chico" style="text-decoration:none;white-space:nowrap" target="_blank" rel="noopener"
              href="${linkWhatsapp(c.telefono, mensajeVacuna(c, peor))}">WhatsApp</a></td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
    </div>

    <div class="sello-demo">Los diez clientes y sus vacunas son de ejemplo. El correo sirve para armar
      campañas de promoción — cirugías, exámenes de sangre, lo que se quiera ofrecer por temporada.</div>`;
}

function copiarCorreos() {
  const correos = BD.clientes.filter(c => c.email).map(c => c.email);
  if (!correos.length) { alert("Ningún cliente tiene correo registrado todavía."); return; }
  const texto = correos.join(", ");
  const avisar = () => alert(`Se copiaron ${correos.length} correos. Pégalos en el "CCO" de tu correo para mandar la promoción.`);
  if (navigator.clipboard) navigator.clipboard.writeText(texto).then(avisar, () => alert(texto));
  else alert(texto);
}
