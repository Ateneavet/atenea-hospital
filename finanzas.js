/* ═══════════════════════════════════════════════════════════════════════
   FINANZAS — vive adentro de "Punto de venta & caja", pero solo la ven
   quienes tienen acceso_finanzas en su perfil (hoy: Norely y Sergio).

   Junta dos fuentes de plata real, sin pedir nada nuevo en Supabase más
   que un par de columnas:
     - Consultas: el cobro que se anota al guardar cada una (categoría +
       monto), en consultas.cobro_categoria / cobro_monto.
     - Hospital: los cargos de siempre (cargos.item × cantidad, con el
       precio de la Lista de precios), agrupados todos como "Hospital".
   No hace falta traer nada nuevo desde Supabase: BD.consultas y
   BD.pacientes ya están cargados con todo lo necesario.
   ═══════════════════════════════════════════════════════════════════════ */

const CATEGORIAS_FINANZAS = ["Consulta", "Vacuna", "Ecografía", "Radiografía", "Cirugía", "Hospital", "Peluquería", "Otro"];
const COLOR_CATEGORIA_FINANZAS = {
  Consulta: "#2F7D5C", Vacuna: "#3B6A8F", Ecografía: "#9A7420", Radiografía: "#B04430",
  Cirugía: "#1D5540", Hospital: "#5F6A64", Peluquería: "#7A5C8E", Otro: "#98A29B",
};

function limitesPeriodoFinanzas(modo, fecha) {
  return modo === "año"
    ? [new Date(fecha.getFullYear(), 0, 1), new Date(fecha.getFullYear() + 1, 0, 1)]
    : [new Date(fecha.getFullYear(), fecha.getMonth(), 1), new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)];
}

function ingresosPorCategoria(desde, hasta) {
  const totales = Object.fromEntries(CATEGORIAS_FINANZAS.map(c => [c, 0]));

  BD.consultas.forEach(c => {
    if (!c.cobroMonto) return;
    const f = new Date(c.fecha);
    if (f < desde || f >= hasta) return;
    const cat = CATEGORIAS_FINANZAS.includes(c.cobroCategoria) ? c.cobroCategoria : "Otro";
    totales[cat] += Number(c.cobroMonto) || 0;
  });

  BD.pacientes.forEach(p => (p.cargos || []).forEach(cg => {
    const f = new Date(cg.cuando);
    if (f < desde || f >= hasta) return;
    totales.Hospital += (buscarItem(cg.item)?.precio || 0) * cg.cantidad;
  }));

  BD.cobrosPeluqueria.forEach(c => {
    const f = new Date(c.fecha);
    if (f < desde || f >= hasta) return;
    totales.Peluquería += Number(c.monto) || 0;
  });

  return totales;
}

/* ── Estado de la pantalla (mes/año, y qué período se está mirando) ── */
let _finanzasModo = "mes";
let _finanzasFecha = new Date();

function cambiarModoFinanzas(modo) { _finanzasModo = modo; pintar(); }
function moverPeriodoFinanzas(delta) {
  if (_finanzasModo === "año") _finanzasFecha.setFullYear(_finanzasFecha.getFullYear() + delta);
  else _finanzasFecha.setMonth(_finanzasFecha.getMonth() + delta);
  pintar();
}

function verCaja() {
  if (!SESION.accesoFinanzas) return verProximamente("caja");
  return verFinanzas();
}

function verFinanzas() {
  const [desde, hasta] = limitesPeriodoFinanzas(_finanzasModo, _finanzasFecha);
  const totales = ingresosPorCategoria(desde, hasta);
  const total = Object.values(totales).reduce((s, n) => s + n, 0);
  const etiquetaPeriodo = _finanzasModo === "año"
    ? String(_finanzasFecha.getFullYear())
    : _finanzasFecha.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  /* El canvas recién existe después de que esto se pinte — Chart.js se
     dibuja en el siguiente tick, cuando el <canvas> ya está en la
     página (ver dibujarGraficoFinanzas más abajo). */
  setTimeout(() => dibujarGraficoFinanzas(totales), 0);

  return `
    <div class="encab">
      <div><h2>Finanzas</h2><div class="sub">Ingresos por tipo de atención · visible solo para Norely y Sergio</div></div>
    </div>

    <div class="panel">
      <div class="adentro">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px">
          <div class="botones">
            <button class="bot ${_finanzasModo === "mes" ? "" : "linea"} chico" onclick="cambiarModoFinanzas('mes')">Por mes</button>
            <button class="bot ${_finanzasModo === "año" ? "" : "linea"} chico" onclick="cambiarModoFinanzas('año')">Por año</button>
          </div>
          <div class="botones" style="align-items:center">
            <button class="bot linea chico" onclick="moverPeriodoFinanzas(-1)">‹</button>
            <b style="min-width:130px;text-align:center;text-transform:capitalize">${etiquetaPeriodo}</b>
            <button class="bot linea chico" onclick="moverPeriodoFinanzas(1)">›</button>
          </div>
        </div>
        <div style="position:relative;height:280px"><canvas id="graficoFinanzas"></canvas></div>
      </div>
    </div>

    <div class="panel">
      <h3>Detalle<span style="font-weight:400;color:var(--gris);font-size:12.5px">Total ${plata(total)}</span></h3>
      <div class="adentro">
        ${total ? `<div class="resumen-iva" style="padding:0 0 10px;border-bottom:1px solid var(--linea-2);margin-bottom:6px">
          <div><span>Neto del período</span><span>${plata(desgloseIva(total).neto)}</span></div>
          <div><span>IVA (19%, incluido en los precios)</span><span>${plata(desgloseIva(total).iva)}</span></div>
        </div>` : ""}
        ${total ? CATEGORIAS_FINANZAS.filter(c => totales[c] > 0).sort((a, b) => totales[b] - totales[a]).map(c => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--linea-2)">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="width:10px;height:10px;border-radius:3px;background:${COLOR_CATEGORIA_FINANZAS[c]};display:inline-block"></span>
              ${c}
            </div>
            <div style="display:flex;gap:14px;align-items:baseline">
              <span style="color:var(--gris);font-size:12.5px">${Math.round(totales[c] / total * 100)}%</span>
              <b style="font-variant-numeric:tabular-nums">${plata(totales[c])}</b>
            </div>
          </div>`).join("") : `<div class="vacio">Sin ingresos registrados en este período.</div>`}
      </div>
    </div>`;
}

let _chartFinanzas = null;
function dibujarGraficoFinanzas(totales) {
  const canvas = document.getElementById("graficoFinanzas");
  if (!canvas || typeof Chart === "undefined") return;
  const labels = CATEGORIAS_FINANZAS.filter(c => totales[c] > 0);
  if (_chartFinanzas) { _chartFinanzas.destroy(); _chartFinanzas = null; }
  if (!labels.length) return;
  _chartFinanzas = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ data: labels.map(c => totales[c]), backgroundColor: labels.map(c => COLOR_CATEGORIA_FINANZAS[c]), borderRadius: 6, maxBarThickness: 56 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => plata(ctx.parsed.y) } },
      },
      scales: {
        y: { ticks: { callback: v => plata(v) }, grid: { color: "#EDEFEC" } },
        x: { grid: { display: false } },
      },
    },
  });
  /* Recién creado, a veces mide mal el tamaño del bloque que lo rodea
     (el <div style="height:280px"> puede no estar del todo asentado en
     el primer tick) y las barras salen movidas — este reajuste, un
     instante después, lo deja bien. */
  requestAnimationFrame(() => _chartFinanzas && _chartFinanzas.resize());
}
