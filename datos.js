/* ═══════════════════════════════════════════════════════════════════════
   DATOS

   Hospital y Lista de precios viven en Supabase (ver supabase.js) y se
   comparten en vivo entre todos los aparatos. Clientes, Agenda y
   Peluquería siguen siendo datos de ejemplo en memoria — se conectan
   cuando se venda ese módulo.
   ═══════════════════════════════════════════════════════════════════════ */

const CLINICA = {
  nombre: "Atenea",
  sub: "Clínica Veterinaria · Viña del Mar",
  direccion: "Av. Los Castaños 125, Viña del Mar",
  telefono: "2 2811 3106",
};

/* Las tres áreas físicas del hospital, tal como las tiene la clínica.
   Cada jaula queda identificada con su área adelante (p. ej. "Felinos ·
   Jaula 1") para que dos jaulas del mismo número, en pisos distintos,
   nunca se confundan entre sí. */
const AREAS_HOSPITAL = [
  { area: "Felinos · 2° piso",            cantidad: 4 },
  { area: "Sector infeccioso · 1° piso",  cantidad: 6 },
  { area: "Canino",                        cantidad: 6 },
];

CLINICA.areas = AREAS_HOSPITAL.map(a => ({
  ...a, jaulas: Array.from({ length: a.cantidad }, (_, i) => `${a.area} · Jaula ${i + 1}`),
}));

/* Lista plana de todas las jaulas — la usa todo el código que hoy ya
   sabe trabajar con "un box es un texto" (el contador de libres, el
   selector al ingresar un paciente, etc.), sin tener que enterarse de
   que ahora hay áreas. */
CLINICA.boxes = CLINICA.areas.flatMap(a => a.jaulas);

/* El catálogo de cargos — ahora vive en Supabase (tabla "catalogo") y
   Norely lo edita sola desde "Lista de precios", sin depender de Luna.
   Acá solo queda el orden en que se muestran los grupos (un grupo nuevo
   que no esté en esta lista simplemente aparece al final) y las variables
   que se llenan al iniciar sesión — ver cargarCatalogoDesdeSupabase() en
   supabase.js. */
const ORDEN_GRUPOS_CATALOGO = ["Hospitalización", "Procedimientos", "Exámenes e imágenes", "Medicamentos", "Insumos"];

let CATALOGO = [];
let CATALOGO_PLANO = [];
const buscarItem = id => CATALOGO_PLANO.find(i => i.id === id);

/* ── Estado en memoria ─────────────────────────────────────────────
   Los pacientes de Hospital ya no viven acá: se traen de Supabase al
   iniciar sesión (ver supabase.js) y quedan en BD.pacientes con la misma
   forma de siempre, para que el resto de la app no note la diferencia.
   Clientes, Agenda y Peluquería siguen siendo datos de ejemplo en
   memoria — se conectan a una base de verdad cuando se venda ese módulo. */
let BD = {
  pacientes: [],
  consultas: [],
  vacunas: [],
  cobrosPeluqueria: [],
  usuario: null,
  clientes: clientesEjemplo(),
  agenda: agendaEjemplo(),
  agendaPeluqueria: peluqueriaEjemplo(),
};

/* ── Menú lateral ──────────────────────────────────────────────────
   El mismo formato de las otras apps del negocio: grupos con título y
   secciones adentro. Por ahora solo Hospital está construido — es lo
   único que a la clínica le importa. El resto queda visible para que
   el dueño vea hacia dónde crece, marcado "Próximamente". */

const SECCIONES = [
  { grupo: null, items: [
    { id: "bienvenida", ic: "🏠", texto: "Bienvenida" },
  ]},
  { grupo: "Clínica & pacientes", items: [
    { id: "consultas",     ic: "🩺", texto: "Consultas" },
    { id: "hospital",      ic: "🏥", texto: "Hospital" },
    { id: "agenda",        ic: "🗓️", texto: "Agenda & recepción" },
    { id: "recordatorios", ic: "🔔", texto: "Recordatorios" },
    { id: "clientes",      ic: "🐾", texto: "Clientes & pacientes" },
    { id: "peluqueria",    ic: "✂️", texto: "Peluquería" },
  ]},
  { grupo: "Caja", items: [
    { id: "caja", ic: "💳", texto: "Punto de venta & caja" },
  ]},
  { grupo: "Productos & servicios", items: [
    { id: "precios",     ic: "🏷️", texto: "Lista de precios" },
    { id: "inventario", ic: "📦", texto: "Inventario & compras" },
  ]},
  { grupo: "Sistema", items: [
    { id: "boxes",         ic: "🛏️", texto: "Boxes & horarios" },
    { id: "configuracion", ic: "⚙️", texto: "Configuración" },
  ]},
];

/* Pantallas que ya viven adentro de Hospital o Consultas y no van en el
   menú principal (se llega a ellas desde una tarjeta o un botón, no
   desde el sidebar). */
const SECCIONES_INTERNAS = ["ficha", "historial", "detalle", "nuevaConsulta", "detalleConsulta"];

/* ═══════════════════════════════════════════════════════════════════════
   CLIENTES Y VACUNAS

   Esto es lo que hoy la clínica no tiene: quién es cada tutor, cómo
   contactarlo y cuándo le toca la próxima vacuna a su mascota. Sin esto,
   cada vacuna puesta es un cliente que se pierde apenas sale por la
   puerta — nadie vuelve a avisarle.

   El vencimiento se calcula solo, cada vez que se abre la pantalla, así
   que nunca queda una fecha vieja mostrando algo que ya no es cierto.
   ═══════════════════════════════════════════════════════════════════════ */

const VACUNAS_CATALOGO = {
  Canino: ["Séxtuple", "Antirrábica", "KC (tos de las perreras)"],
  Felino: ["Triple felina", "Antirrábica", "Leucemia felina"],
};

/* Diez clientes de ejemplo: mascota, tutor, cómo contactarlo, y sus
   vacunas con la fecha en que realmente les toca — algunas vencidas,
   algunas por vencer esta semana, algunas recién puestas. */
function clientesEjemplo() {
  const hoy = new Date();
  const en = n => new Date(hoy.getTime() + n * 86400000).toISOString();
  const dosis = (nombre, diasProxima) => ({
    nombre, ultima: en(diasProxima - 365), proxima: en(diasProxima),
  });

  return [
    { id: 1001, nombre: "Simón",  especie: "Canino", tutor: "Antonia Vergara",   telefono: "+56 9 0000 0001", email: "antonia@ejemplo.cl",
      vacunas: [dosis("Séxtuple", -58), dosis("Antirrábica", 210)] },
    { id: 1002, nombre: "Frida",  especie: "Felino", tutor: "Camila Undurraga",  telefono: "+56 9 0000 0002", email: "camila@ejemplo.cl",
      vacunas: [dosis("Triple felina", 5)] },
    { id: 1003, nombre: "Tomás",  especie: "Canino", tutor: "Rodrigo Achondo",   telefono: "+56 9 0000 0003", email: "",
      vacunas: [dosis("Antirrábica", -31), dosis("Séxtuple", 140)] },
    { id: 1004, nombre: "Lola",   especie: "Canino", tutor: "Javiera Errázuriz", telefono: "+56 9 0000 0004", email: "javiera@ejemplo.cl",
      vacunas: [dosis("Séxtuple", 40), dosis("Antirrábica", 300)] },
    { id: 1005, nombre: "Pancho", especie: "Canino", tutor: "Sebastián Toro",    telefono: "+56 9 0000 0005", email: "",
      vacunas: [dosis("KC (tos de las perreras)", -95)] },
    { id: 1006, nombre: "Nube",   especie: "Felino", tutor: "Fernanda Mira",     telefono: "+56 9 0000 0006", email: "fernanda@ejemplo.cl",
      vacunas: [dosis("Triple felina", 120), dosis("Antirrábica", 250)] },
    { id: 1007, nombre: "Rocco",  especie: "Canino", tutor: "Ignacio Bulnes",    telefono: "+56 9 0000 0007", email: "ignacio@ejemplo.cl",
      vacunas: [dosis("Séxtuple", 10)] },
    { id: 1008, nombre: "Mila",   especie: "Canino", tutor: "Paula Jaramillo",   telefono: "+56 9 0000 0008", email: "paula@ejemplo.cl",
      vacunas: [dosis("Antirrábica", -20), dosis("Séxtuple", 88)] },
    { id: 1009, nombre: "Otto",   especie: "Canino", tutor: "Matías Cifuentes",  telefono: "+56 9 0000 0009", email: "",
      vacunas: [dosis("Séxtuple", -64)] },
    { id: 1010, nombre: "Kira",   especie: "Felino", tutor: "Valentina Ossa",    telefono: "+56 9 0000 0010", email: "valentina@ejemplo.cl",
      vacunas: [dosis("Triple felina", 4)] },
  ];
}

/* Estado de una dosis: vigente, por vencer (30 días o menos) o vencida.
   Se recalcula siempre contra el reloj de hoy. */
function estadoVacuna(v) {
  const dias = Math.ceil((new Date(v.proxima) - new Date()) / 86400000);
  if (dias < 0) return "vencida";
  if (dias <= 30) return "por-vencer";
  return "vigente";
}

const PESO_ESTADO_VACUNA = { vencida: 0, "por-vencer": 1, vigente: 2 };

/* El peor estado entre todas las vacunas del cliente — así se le avisa
   por la que más urge. */
function peorVacuna(cliente) {
  return [...cliente.vacunas].sort((a, b) =>
    PESO_ESTADO_VACUNA[estadoVacuna(a)] - PESO_ESTADO_VACUNA[estadoVacuna(b)])[0];
}

/* La agenda de hoy: quién viene, a qué hora, con quién y para qué. Es
   una maqueta — todavía no hay un calendario de verdad detrás; sirve
   para que la recepción vea de un vistazo lo que tiene que pasar hoy. */
function agendaEjemplo() {
  return [
    { hora: "09:00", paciente: "Simón",  tutor: "Antonia Vergara",   servicio: "Vacunación anual",          profesional: "Dr. Sergio", estado: "Finalizado" },
    { hora: "09:30", paciente: "Frida",  tutor: "Camila Undurraga",  servicio: "Control post operatorio",   profesional: "Dra. Javiera",    estado: "Finalizado" },
    { hora: "10:30", paciente: "Lola",   tutor: "Javiera Errázuriz", servicio: "Consulta cardiológica",     profesional: "Dr. Sergio", estado: "Atendiendo" },
    { hora: "11:00", paciente: "Pancho", tutor: "Sebastián Toro",    servicio: "Consulta general",          profesional: "Dra. Javiera",    estado: "En espera" },
    { hora: "11:30", paciente: "Nube",   tutor: "Fernanda Mira",     servicio: "Vacunación triple felina",  profesional: "Dra. Javiera",    estado: "En espera" },
    { hora: "15:00", paciente: "Otto",   tutor: "Matías Cifuentes",  servicio: "Control de artrosis",       profesional: "Dra. Javiera",    estado: "Confirmada" },
    { hora: "15:30", paciente: "Kira",   tutor: "Valentina Ossa",    servicio: "Segunda dosis de cachorra", profesional: "Dra. Javiera",    estado: "Confirmada" },
  ];
}

/* ═══════════════════════════════════════════════════════════════════════
   PELUQUERÍA

   Recién la agregaron como servicio. Por ahora es su propia agenda del
   día y su lista de precios — el mismo formato que ya se usa en Agenda
   & recepción, para que a la recepcionista no le cambie el mundo.
   ═══════════════════════════════════════════════════════════════════════ */

const SERVICIOS_PELUQUERIA = [
  { nombre: "Baño · raza pequeña (hasta 10 kg)", precio: 12000 },
  { nombre: "Baño · raza mediana (10 a 25 kg)",  precio: 16000 },
  { nombre: "Baño · raza grande (25 kg o más)",  precio: 20000 },
  { nombre: "Corte de pelo",                     precio: 14000 },
  { nombre: "Deslanado",                         precio: 18000 },
  { nombre: "Corte de uñas",                     precio: 5000  },
  { nombre: "Limpieza de oídos",                 precio: 5000  },
];

function peluqueriaEjemplo() {
  return [
    { hora: "09:30", paciente: "Simón", tutor: "Antonia Vergara",  servicio: "Baño · raza grande",     profesional: "Iván Tapia", estado: "Finalizado" },
    { hora: "10:30", paciente: "Tomás", tutor: "Rodrigo Achondo",  servicio: "Baño · raza pequeña",    profesional: "Iván Tapia", estado: "Atendiendo" },
    { hora: "12:00", paciente: "Mila",  tutor: "Paula Jaramillo",  servicio: "Corte de uñas",          profesional: "Iván Tapia", estado: "En espera" },
    { hora: "16:30", paciente: "Rocco", tutor: "Ignacio Bulnes",   servicio: "Baño y deslanado",       profesional: "Iván Tapia", estado: "Confirmada" },
  ];
}
