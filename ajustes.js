/* ═══════════════════════════════════════════════════════════════════════
   AJUSTES / CONFIGURACIÓN
   ═══════════════════════════════════════════════════════════════════════ */

function verAjustes() {
  const total = BD.pacientes.length;
  return `
    <div class="encab"><div><h2>Ajustes</h2>
      <div class="sub">Lo que se configura una sola vez</div></div></div>

    <div class="sello-demo">Hospital ya se comparte en vivo entre todos los aparatos —lo que
      carga un celular lo ve al tiro el computador de recepción. Clientes, Agenda y
      Peluquería todavía son de ejemplo, cada uno en el aparato donde se abren.</div>

    <div class="panel">
      <h3>Sesión</h3>
      <div class="adentro">
        <div class="rejilla" style="margin-bottom:13px">
          <div class="dato"><div class="e">Conectado como</div><div class="v">${esc(SESION.nombre)}</div></div>
          <div class="dato"><div class="e">Rol</div><div class="v">${SESION.rol === "recepcion" ? "Recepción" : "Clínico"}</div></div>
        </div>
        <p style="color:var(--gris);font-size:13.5px;margin:0 0 13px">Cada control y cada cargo queda
          firmado con este nombre — es tu sesión, no un nombre que cualquiera puede elegir.</p>
        <button class="bot linea" onclick="cerrarSesion()">Cerrar sesión</button>
      </div>
    </div>

    <div class="panel">
      <h3>Datos</h3>
      <div class="adentro">
        <p style="margin:0 0 13px;color:var(--gris);font-size:13.5px">
          Hay ${total} ${total === 1 ? "ficha" : "fichas"} guardadas en Hospital, con datos de ejemplo
          incluidos. Al empezar de cero se borran <b>para todos los que usan el sistema</b>, no
          solo en este aparato, y la app queda lista para usarla de verdad.</p>
        <div class="botones">
          <button class="bot peligro" onclick="empezarDeCero()">Empezar de cero</button>
        </div>
      </div>
    </div>`;
}

async function empezarDeCero() {
  if (!confirm("Se borran todas las fichas de Hospital para TODOS los que usan el sistema, incluidos los ejemplos.\n\nEsto no se puede deshacer. ¿Seguir?")) return;
  const { error } = await sb.from("pacientes").delete().gt("id", 0);
  if (error) { alert("No se pudo borrar.\n\n" + error.message); return; }
  await cargarPacientesDesdeSupabase();
  ir("hospital");
}
