/* ═══════════════════════════════════════════════════════════════════════
   ARRANQUE — lo último que se carga. Conecta los botones fijos de la
   página (el de usuario, el ☰) y revisa si ya había una sesión de
   Supabase abierta en este navegador para entrar directo, sin pedir la
   clave de nuevo.
   ═══════════════════════════════════════════════════════════════════════ */

document.getElementById("botUsuario").onclick = cerrarSesion;
document.getElementById("botHamb").onclick = abrirLateral;

(async () => {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) await cargarPerfilYEntrar(session.user.id);
    else mostrarLogin();
  } catch (e) {
    console.error("No se pudo conectar con Supabase al arrancar:", e);
    mostrarLogin("No se pudo conectar con el servidor. Revisa la conexión a internet.");
  }
})();

/* El reloj de Bienvenida late solo, sin repintar toda la pantalla. */
setInterval(() => {
  const nodo = document.getElementById("reloj");
  if (nodo) nodo.textContent = reloj().hora;
}, 1000);
