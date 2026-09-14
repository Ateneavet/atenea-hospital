/* ═══════════════════════════════════════════════════════════════════════
   SESIÓN — ahora de verdad, con Supabase Auth

   Cada persona tiene su propia cuenta (correo + clave), creada por Luna
   en el panel de Supabase (Authentication → Users). Al iniciar sesión se
   busca su perfil (nombre y rol) en la tabla "perfiles" — eso es lo que
   firma cada control, cada cargo y cada fármaco administrado.
   ═══════════════════════════════════════════════════════════════════════ */

let SESION = null;

function mostrarLogin(error) {
  document.getElementById("pantallaLogin").innerHTML = `
    <div class="login-caja">
      <div class="marca">
        <div class="logo"><img alt="" id="logoClinicaLogin">A</div>
        <div><h1>${esc(CLINICA.nombre)}</h1><div class="sub">Software clínico</div></div>
      </div>
      <form onsubmit="intentarLogin(event)">
        <label class="campo"><span>Correo</span>
          <input name="correo" type="email" required autocomplete="username"></label>
        <label class="campo"><span>Clave</span>
          <input name="clave" type="password" required autocomplete="current-password"></label>
        ${error ? `<div class="aviso-tutor" style="margin-bottom:13px">${esc(error)}</div>` : ""}
        <button class="bot" type="submit" style="width:100%">Entrar</button>
      </form>
    </div>`;
}

async function intentarLogin(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const { data, error } = await sb.auth.signInWithPassword({
    email: f.get("correo").trim(), password: f.get("clave"),
  });
  if (error) { mostrarLogin("Correo o clave incorrectos."); return; }
  await cargarPerfilYEntrar(data.user.id);
}

async function cargarPerfilYEntrar(userId) {
  const { data: perfil, error } = await sb.from("perfiles").select("nombre,rol").eq("id", userId).single();
  if (error || !perfil) {
    mostrarLogin("Esta cuenta no tiene un perfil asignado todavía. Avísale a Luna.");
    await sb.auth.signOut();
    return;
  }
  SESION = { nombre: perfil.nombre, rol: perfil.rol };
  BD.usuario = perfil.nombre;
  entrarAlSistema();
}

async function cerrarSesion() {
  if (!confirm(`¿Cerrar sesión de ${SESION.nombre}?`)) return;
  await sb.auth.signOut();
  SESION = null;
  document.getElementById("appShell").classList.add("oculto");
  mostrarLogin();
}

function entrarAlSistema() {
  document.getElementById("appShell").classList.remove("oculto");
  document.getElementById("pantallaLogin").innerHTML = "";
  vista = "bienvenida";
  suscribirCambiosHospital();
  cargarCatalogoDesdeSupabase().then(() => cargarPacientesDesdeSupabase());
}
