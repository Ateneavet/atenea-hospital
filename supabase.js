/* ═══════════════════════════════════════════════════════════════════════
   CONEXIÓN A SUPABASE — acá vive todo lo que antes hacía localStorage.

   Los pacientes (Hospital) ahora se guardan en una base compartida: lo
   que carga el celular de un médico lo ve al tiro el computador de
   recepción, y viceversa. Clientes, Agenda y Peluquería siguen siendo
   datos de ejemplo en memoria — eso se conecta después, cuando se venda
   ese módulo (hoy el mes de prueba es solo Hospital).

   ANTES DE USAR: reemplaza SUPABASE_URL y SUPABASE_ANON_KEY por los de
   tu proyecto (Supabase → Settings → API). El "anon key" no es secreto:
   está pensado para ir en el navegador, la seguridad de verdad la ponen
   las reglas de acceso (RLS) que ya vienen en supabase-schema.sql.
   ═══════════════════════════════════════════════════════════════════════ */

const SUPABASE_URL = "https://ocwzxxrdfoqgnbsjopmn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p4eHJkZm9xZ25ic2pvcG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNDgzMjQsImV4cCI6MjEwNDkyNDMyNH0.9j11vMXjuc8kJxEv7BS-E_MIcp6ZfmTm-inBC-Dahhc";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Traer todo lo de Hospital y armarlo con la misma forma de siempre
   (paciente con sus eventos, cargos, fármacos y administraciones adentro)
   para que el resto de la app (hospital.js, ficha.js) no tenga que
   enterarse de que ahora viene de Supabase y no de un array local. */

async function cargarPacientesDesdeSupabase(revisarCargosAutomaticos = true) {
  const { data: pacientes, error: errPacientes } = await sb
    .from("pacientes").select("*").order("ingreso", { ascending: true });

  if (errPacientes) {
    console.error("No se pudo leer Hospital desde Supabase:", errPacientes);
    document.getElementById("vista").innerHTML =
      `<div class="panel"><div class="vacio">No se pudo conectar con la base de datos.<br>${esc(errPacientes.message)}</div></div>`;
    return;
  }

  const ids = pacientes.map(p => p.id);
  const vacio = { data: [] };
  const [{ data: eventos }, { data: cargos }, { data: farmacos }, { data: administraciones }] = ids.length
    ? await Promise.all([
        sb.from("eventos").select("*").in("paciente_id", ids).order("cuando"),
        sb.from("cargos").select("*").in("paciente_id", ids).order("cuando"),
        sb.from("farmacos").select("*").in("paciente_id", ids).order("agregado"),
        sb.from("administraciones").select("*").in("paciente_id", ids),
      ])
    : [vacio, vacio, vacio, vacio];

  BD.pacientes = pacientes.map(p => ({
    id: p.id, nombre: p.nombre, especie: p.especie, raza: p.raza, edad: p.edad, peso: p.peso,
    tutor: p.tutor, telefono: p.telefono, motivo: p.motivo, box: p.box, estado: p.estado,
    ingreso: p.ingreso, egreso: p.egreso, desenlace: p.desenlace,
    eventos: (eventos || []).filter(e => e.paciente_id === p.id)
      .map(e => ({ id: e.id, cuando: e.cuando, quien: e.quien, temp: e.temp, texto: e.texto, tutor: e.tutor })),
    cargos: (cargos || []).filter(c => c.paciente_id === p.id)
      .map(c => ({ id: c.id, cuando: c.cuando, item: c.item, cantidad: c.cantidad, quien: c.quien })),
    farmacos: (farmacos || []).filter(f => f.paciente_id === p.id)
      .map(f => ({ id: f.id, item: f.item, agregado: f.agregado, dosisMgKg: f.dosis_mg_kg, frecuencia: f.frecuencia, dias: f.dias })),
    administraciones: (administraciones || []).filter(a => a.paciente_id === p.id)
      .map(a => ({ id: a.id, farmacoId: a.farmaco_id, fecha: a.fecha, hora: a.hora, quien: a.quien, cuando: a.cuando, cargoId: a.cargo_id })),
  }));

  if (revisarCargosAutomaticos && await asegurarCargosHospitalizacion()) {
    return cargarPacientesDesdeSupabase(false);
  }
  pintar();
}

/* ── Cobro automático del día de hospitalización ─────────────────────
   Apenas un paciente ingresa se le cobra el día 1, y cada 24 horas que
   sigue adentro se le agrega el día siguiente solo — sin que nadie tenga
   que acordarse de cargarlo a mano. Se revisa cada vez que se trae la
   lista de Hospital desde Supabase. Devuelve true si agregó algún cargo,
   para que cargarPacientesDesdeSupabase() vuelva a traer los datos ya
   completos antes de pintar.

   Nota: si dos aparatos abren Hospital en el mismísimo instante en que
   cambia el día, en teoría podrían cobrar el mismo día dos veces. Es un
   caso raro y fácil de arreglar a mano — el botón ✕ de un cargo, en la
   ficha, lo borra. */
async function asegurarCargosHospitalizacion() {
  let cambio = false;
  for (const p of hospitalizados()) {
    const item = p.estado === "critico" ? "hosp-uci" : "hosp-dia";
    const diasQueLleva = dias(p.ingreso);
    const yaCargados = p.cargos
      .filter(c => c.item === "hosp-dia" || c.item === "hosp-uci")
      .reduce((s, c) => s + c.cantidad, 0);
    const faltan = diasQueLleva - yaCargados;
    for (let i = 0; i < faltan; i++) {
      await sb.from("cargos").insert({ paciente_id: p.id, item, cantidad: 1, quien: "Sistema" });
      cambio = true;
    }
  }
  return cambio;
}

/* ── Consultas ─────────────────────────────────────────────────────────
   Ficha de una atención común, sin jaula ni internación: vive en su
   propia tabla ("consultas"), separada de Hospital. */

async function cargarConsultasDesdeSupabase() {
  const { data, error } = await sb.from("consultas").select("*").order("fecha", { ascending: false });
  if (error) { console.error("No se pudieron leer las consultas:", error); return; }
  BD.consultas = data.map(c => ({
    id: c.id, fecha: c.fecha, quien: c.quien, estado: c.estado,
    nombre: c.nombre, especie: c.especie, raza: c.raza, edad: c.edad, peso: c.peso,
    esterilizado: c.esterilizado, conviveMascotas: c.convive_mascotas,
    enfermedadesPrevias: c.enfermedades_previas, tutor: c.tutor, telefono: c.telefono,
    motivo: c.motivo, anamnesisRemota: c.anamnesis_remota, anamnesisActual: c.anamnesis_actual,
    fc: c.fc, fr: c.fr, temperatura: c.temperatura, examenFisico: c.examen_fisico,
    prediagnosticos: c.prediagnosticos, examenesSolicitados: c.examenes_solicitados,
    ordenMedica: c.orden_medica, proximoControl: c.proximo_control,
    cobroCategoria: c.cobro_categoria, cobroMonto: c.cobro_monto,
  }));
  pintar();
}

/* ── Vacunas aplicadas (recordatorios) ────────────────────────────────
   Cada fila es una dosis puesta en una Consulta, con su próxima fecha
   ya calculada — de ahí sale todo lo de Recordatorios. */

async function cargarVacunasDesdeSupabase() {
  const { data, error } = await sb.from("vacunas_aplicadas").select("*").order("proxima_fecha");
  if (error) { console.error("No se pudieron leer las vacunas:", error); return; }
  BD.vacunas = data.map(v => ({
    id: v.id, consultaId: v.consulta_id, paciente: v.paciente, tutor: v.tutor, telefono: v.telefono,
    especie: v.especie, vacuna: v.vacuna, email: v.email, fechaAplicada: v.fecha_aplicada, proximaFecha: v.proxima_fecha,
    quien: v.quien, avisado: v.avisado,
  }));
  pintar();
}

/* ── Cobros de peluquería (alimenta Finanzas) ─────────────────────────── */

async function cargarCobrosPeluqueriaDesdeSupabase() {
  const { data, error } = await sb.from("cobros_peluqueria").select("*").order("fecha", { ascending: false });
  if (error) { console.error("No se pudieron leer los cobros de peluquería:", error); return; }
  BD.cobrosPeluqueria = data.map(c => ({
    id: c.id, fecha: c.fecha, quien: c.quien, paciente: c.paciente, tutor: c.tutor,
    servicio: c.servicio, monto: c.monto,
  }));
  pintar();
}

/* ── Lista de precios ─────────────────────────────────────────────────
   Igual que los pacientes: se trae de Supabase y se arma con la misma
   forma que usaba el catálogo fijo de antes (grupos con items adentro),
   para que precios.js, hospital.js y ficha.js no tengan que cambiar cómo
   lo usan. */
async function cargarCatalogoDesdeSupabase() {
  const { data, error } = await sb.from("catalogo").select("*").order("nombre");
  if (error) { console.error("No se pudo leer la lista de precios:", error); return; }

  CATALOGO_PLANO = data.map(i => ({ id: i.id, nombre: i.nombre, precio: Number(i.precio), grupo: i.grupo }));

  const grupos = [...new Set([...ORDEN_GRUPOS_CATALOGO, ...CATALOGO_PLANO.map(i => i.grupo)])];
  CATALOGO = grupos
    .map(grupo => ({ grupo, items: CATALOGO_PLANO.filter(i => i.grupo === grupo) }))
    .filter(g => g.items.length);

  pintar();
}

/* ── En vivo entre aparatos ───────────────────────────────────────────
   Cuando alguien carga algo desde su celular, este aparato se entera
   solo y se repinta — sin recargar la página. Se agrupan los avisos que
   llegan pegados (por ejemplo, marcar un fármaco escribe en dos tablas a
   la vez) para no traer los datos dos veces por el mismo cambio. */
let _reintentoCarga = null;
function _programarRecarga() {
  clearTimeout(_reintentoCarga);
  _reintentoCarga = setTimeout(() => cargarPacientesDesdeSupabase(), 200);
}

let _reintentoCatalogo = null;
function _programarRecargaCatalogo() {
  clearTimeout(_reintentoCatalogo);
  _reintentoCatalogo = setTimeout(() => cargarCatalogoDesdeSupabase(), 200);
}

let _reintentoConsultas = null;
function _programarRecargaConsultas() {
  clearTimeout(_reintentoConsultas);
  _reintentoConsultas = setTimeout(() => cargarConsultasDesdeSupabase(), 200);
}

let _reintentoVacunas = null;
function _programarRecargaVacunas() {
  clearTimeout(_reintentoVacunas);
  _reintentoVacunas = setTimeout(() => cargarVacunasDesdeSupabase(), 200);
}

let _reintentoCobrosPeluqueria = null;
function _programarRecargaCobrosPeluqueria() {
  clearTimeout(_reintentoCobrosPeluqueria);
  _reintentoCobrosPeluqueria = setTimeout(() => cargarCobrosPeluqueriaDesdeSupabase(), 200);
}

function suscribirCambiosHospital() {
  sb.channel("hospital-en-vivo")
    .on("postgres_changes", { event: "*", schema: "public", table: "pacientes" }, _programarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, _programarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "cargos" }, _programarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "farmacos" }, _programarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "administraciones" }, _programarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "catalogo" }, _programarRecargaCatalogo)
    .on("postgres_changes", { event: "*", schema: "public", table: "consultas" }, _programarRecargaConsultas)
    .on("postgres_changes", { event: "*", schema: "public", table: "vacunas_aplicadas" }, _programarRecargaVacunas)
    .on("postgres_changes", { event: "*", schema: "public", table: "cobros_peluqueria" }, _programarRecargaCobrosPeluqueria)
    .subscribe();
}
