/* ═══════════════════════════════════════════════════════════════════════
   NÚCLEO — ayudas, estado de la pantalla y el motor que pinta todo

   Esto es lo primero que se carga. Todos los demás archivos (hospital.js,
   ficha.js, agenda.js, etc.) dan por hecho que esto ya existe: las ayudas
   chicas (esc, plata, fecha…), el estado de qué pantalla está abierta, y
   pintar(), que es quien decide qué función de pantalla llamar.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Ayudas chicas ────────────────────────────────────────────────── */

const esc = t => String(t ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const plata = n => "$" + Math.round(n).toLocaleString("es-CL");

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function fecha(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${hh}:${mm}`;
}

/* "hace 3 h", "hace 2 días" — lo que uno lee de reojo en el pasillo. */
function desde(iso) {
  const min = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

const horas = iso => (Date.now() - new Date(iso)) / 3600000;

function dias(desdeIso, hastaIso) {
  /* El día de ingreso cuenta como día 1, que es como se cobra. */
  const ms = new Date(hastaIso || Date.now()) - new Date(desdeIso);
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

const NOMBRE_ESTADO = { estable: "Estable", delicado: "Delicado", critico: "Crítico" };

const hospitalizados = () => BD.pacientes.filter(p => !p.egreso);
const egresados = () => BD.pacientes.filter(p => p.egreso);
const paciente = id => BD.pacientes.find(p => p.id === id);

const ultimoEvento = p => p.eventos.length ? p.eventos[p.eventos.length - 1] : null;
const ultimoAvisoTutor = p => [...p.eventos].reverse().find(e => e.tutor);
const cuenta = p => p.cargos.reduce((s, c) => s + (buscarItem(c.item)?.precio || 0) * c.cantidad, 0);

/* Agenda y Peluquería son datos de ejemplo en memoria (todavía no viven
   en Supabase); anotar() solo repinta. Lo de Hospital ya no pasa por
   acá — cada función de hospital.js/ficha.js escribe directo a Supabase
   y deja que la suscripción en vivo (supabase.js) traiga los datos de
   vuelta y repinte. */
function anotar() { pintar(); }

/* Fecha y hora de "ahora mismo", usada en Bienvenida, Agenda y Peluquería. */
function reloj() {
  const ahora = new Date();
  const h = ahora.getHours();
  const saludo = h < 6 || h >= 20 ? "Buenas noches" : h < 12 ? "Buenos días" : "Buenas tardes";
  const fecha = ahora.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  return { saludo, fecha, hora: ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) };
}

/* Selector de estado (estable/delicado/crítico), usado al ingresar un
   paciente y al registrar un control. */
const opcionesEstado = actual => ["estable", "delicado", "critico"]
  .map(e => `<option value="${e}" ${e === actual ? "selected" : ""}>${NOMBRE_ESTADO[e]}</option>`).join("");

/* ── Estado de la pantalla ────────────────────────────────────────── */

let vista = "bienvenida";
let abierto = null;   // id del paciente cuya ficha se está mirando

function ir(v, id = null) {
  vista = v; abierto = id;
  window.scrollTo(0, 0);
  pintar();
}

/* ── Armado general ───────────────────────────────────────────────── */

/* Secciones que hoy están construidas de verdad. El resto del menú
   (SECCIONES, en datos.js) se ve pero muestra "Próximamente". */
const CONSTRUIDAS = new Set(["bienvenida", "hospital", "ficha", "boxes", "historial", "configuracion", "agenda", "clientes", "peluqueria", "precios", "detalle"]);

function pintar() {
  document.getElementById("nombreClinica").textContent = CLINICA.nombre;
  document.getElementById("usuarioActual").textContent = BD.usuario;

  // Qué botón del sidebar queda marcado según la pantalla abierta.
  const activo = { ficha: "hospital", historial: "hospital", detalle: "hospital" }[vista] || vista;

  document.getElementById("menu").innerHTML = SECCIONES.map(g => `
    ${g.grupo ? `<div class="grupo-titulo">${g.grupo}</div>` : ""}
    ${g.items.map(m => `
      <button aria-current="${m.id === activo}" onclick="ir('${m.id}')">
        <span class="ic">${m.ic}</span>${m.texto}
        ${CONSTRUIDAS.has(m.id) ? "" : `<span class="prox">Próx.</span>`}
      </button>`).join("")}`).join("");

  const pantallas = {
    bienvenida: verBienvenida, hospital: verHospital, ficha: verFicha,
    boxes: verBoxes, historial: verHistorial, configuracion: verAjustes,
    agenda: verAgenda, clientes: verClientes, peluqueria: verPeluqueria,
    detalle: verDetalle, precios: verListaPrecios,
  };
  document.getElementById("vista").innerHTML =
    (pantallas[vista] || (() => verProximamente(vista)))();

  cerrarLateral();
}

function abrirLateral() {
  document.getElementById("lateral").classList.add("abierto");
  document.getElementById("veloLateral").classList.add("abierto");
}
function cerrarLateral() {
  document.getElementById("lateral").classList.remove("abierto");
  document.getElementById("veloLateral").classList.remove("abierto");
}

/* Pantalla de relleno para todo lo que aparece en el menú pero todavía
   no se construyó (SECCIONES marca cuáles con CONSTRUIDAS, arriba). */
function verProximamente(id) {
  const item = SECCIONES.flatMap(g => g.items).find(m => m.id === id);
  return `
    <div class="encab"><div><h2>${item ? item.texto : "Próximamente"}</h2></div></div>
    <div class="proximamente">
      <span class="ic">${item ? item.ic : "🚧"}</span>
      Esta sección todavía no está construida.<br>Por ahora, el sistema resuelve Hospital.
    </div>`;
}

/* ── Ventanas emergentes (modal) ──────────────────────────────────── */

function ventana(html) {
  document.getElementById("ventana").innerHTML =
    `<div class="velo" onclick="if(event.target===this)cerrar()"><div class="modal">${html}</div></div>`;
  const primero = document.querySelector(".modal input,.modal select,.modal textarea");
  if (primero) primero.focus();
}

function cerrar() { document.getElementById("ventana").innerHTML = ""; }

document.addEventListener("keydown", e => { if (e.key === "Escape") cerrar(); });
