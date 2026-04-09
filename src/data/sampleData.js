// =============================================================================
// DATOS DE EJEMPLO — Dashboard Supermercado Independiente (España)
// Enero 2023 – Marzo 2025 (27 meses)
// =============================================================================

// Factores de estacionalidad por mes (1.0 = media)
const ESTACIONALIDAD = {
  '01': 0.82, // Enero: cuesta arriba, post-Navidad
  '02': 0.85,
  '03': 0.93,
  '04': 1.05, // Semana Santa
  '05': 0.98,
  '06': 1.02,
  '07': 0.96, // Verano: barrio se vacía algo
  '08': 0.88, // Agosto flojo
  '09': 0.97,
  '10': 1.01,
  '11': 1.04, // Pre-Navidad
  '12': 1.30, // Navidad
};

// Días hábiles aproximados por mes (L-S, sin festivos)
const DIAS_HABILES = {
  '01': 25, '02': 23, '03': 26, '04': 25, '05': 26, '06': 25,
  '07': 26, '08': 26, '09': 25, '10': 27, '11': 25, '12': 26,
};

// Suministros base con estacionalidad (refrigeración verano, calefacción invierno)
const FACTOR_SUMINISTROS = {
  '01': 1.25, '02': 1.18, '03': 1.05, '04': 0.92, '05': 0.88, '06': 1.02,
  '07': 1.30, '08': 1.35, '09': 1.10, '10': 0.95, '11': 1.00, '12': 1.15,
};

function generarDatos() {
  const datos = [];
  let saldoBancario = 44_780;
  let numEmpleados = 9;

  for (let year = 2023; year <= 2025; year++) {
    const mesMax = year === 2025 ? 3 : 12;
    for (let m = 1; m <= mesMax; m++) {
      const mm = String(m).padStart(2, '0');
      const periodo = `${year}-${mm}`;
      const estacion = ESTACIONALIDAD[mm];
      const diasHab = DIAS_HABILES[mm];

      // ---- Empleados: crece ligeramente ----
      if (year === 2023 && m === 9) numEmpleados = 10;
      if (year === 2024 && m === 3) numEmpleados = 10;
      if (year === 2024 && m === 6) numEmpleados = 11;
      if (year === 2025 && m === 1) numEmpleados = 11;

      // ---- Ventas ----
      const ventaBase = 97_500; // media mensual
      const inflacion = year === 2023 ? 1.0 : year === 2024 ? 1.035 : 1.055;
      const ruido = 0.97 + Math.sin(year * 13 + m * 7) * 0.03 + ((m * 17 + year) % 7) * 0.005;
      const ventasTotal = Math.round(ventaBase * estacion * inflacion * ruido);
      const numeroTickets = Math.round(ventasTotal / (12.5 + (m % 3) * 0.4 + (year - 2023) * 0.3));
      const ticketMedio = +(ventasTotal / numeroTickets).toFixed(2);
      const ventasDiasHabiles = +(ventasTotal / diasHab).toFixed(0);

      // ---- Compras / Margen ----
      // Margen bruto 22-26%, con tendencia a comprimirse en meses flojos
      let margenBrutoPctBase = 24.2;
      // Diciembre mejor margen (productos premium), enero/febrero peor
      if (mm === '12') margenBrutoPctBase = 25.8;
      if (mm === '01') margenBrutoPctBase = 22.5;
      if (mm === '02') margenBrutoPctBase = 23.0;
      if (mm === '08') margenBrutoPctBase = 23.3;
      // 2024 ligera presión de costes
      if (year === 2024) margenBrutoPctBase -= 0.4;
      if (year === 2025) margenBrutoPctBase -= 0.2;
      // Ruido
      const ruidoMargen = ((m * 3 + year * 11) % 13 - 6) * 0.15;
      const margenBrutoPct = +(margenBrutoPctBase + ruidoMargen).toFixed(1);
      const costeMercancia = Math.round(ventasTotal * (1 - margenBrutoPct / 100));
      const margenBruto = ventasTotal - costeMercancia;

      // ---- Personal ----
      // SMI sube en 2024 y 2025
      const costePorEmpleado = year === 2023 ? 1_620 : year === 2024 ? 1_710 : 1_780;
      const ruidoPersonal = 1 + ((m * 7 + year) % 5 - 2) * 0.012;
      const salarioBruto = Math.round(numEmpleados * costePorEmpleado * ruidoPersonal);
      const cuotaEmpresaSS = Math.round(salarioBruto * 0.315);
      // Paga extra en junio y diciembre
      let extraPaga = 0;
      if (m === 6 || m === 12) extraPaga = Math.round(salarioBruto * 0.08);
      const costePersonalTotal = salarioBruto + cuotaEmpresaSS + extraPaga;
      const pctPersonalSobreVentas = +(costePersonalTotal / ventasTotal * 100).toFixed(1);

      // ---- Gastos fijos ----
      const alquiler = 2_800;
      const seguros = 445 + (year - 2023) * 15;
      const gestoria = 345 + (year - 2023) * 10;
      const suministrosBase = 2_350;
      const suministros = Math.round(suministrosBase * FACTOR_SUMINISTROS[mm] * (1 + (year - 2023) * 0.06));
      const otros = Math.round(420 + ((m * 11 + year * 3) % 9) * 55);
      const gastosTotal = suministros + alquiler + seguros + gestoria + otros;

      // ---- Resultado ----
      const resultadoBruto = margenBruto - gastosTotal - costePersonalTotal;
      // Estimación simplificada de impuestos (~25% IS sobre beneficio positivo)
      const impuestoEstimado = resultadoBruto > 0 ? Math.round(resultadoBruto * 0.25) : 0;
      const resultadoNeto = resultadoBruto - impuestoEstimado;
      const pctResultadoSobreVentas = +(resultadoNeto / ventasTotal * 100).toFixed(1);

      // ---- Tesorería ----
      const cobros = ventasTotal + Math.round(((m * 3) % 5 - 2) * 120); // casi todo al contado
      const pagos = costeMercancia + costePersonalTotal + gastosTotal + impuestoEstimado;
      saldoBancario = saldoBancario + cobros - pagos;
      // Evitar que baje demasiado (inyección puntual simulada)
      if (saldoBancario < 15_000) saldoBancario += 12_000;
      const diasPagoProveedores = 30 + ((m + year) % 4) * 5; // 30-45 días

      // ---- Fiscal: IVA ----
      // Tipo efectivo repercutido ~7.5% (mezcla 4%, 10%, 21%)
      const tipoEfectivoIVA = 0.074 + ((m % 3) * 0.002);
      const ivaRepercutido = Math.round(ventasTotal * tipoEfectivoIVA);
      // IVA soportado: sobre compras (~6.5% efectivo) + gastos (21% en servicios)
      const ivaSoportadoCompras = Math.round(costeMercancia * 0.065);
      const ivaSoportadoGastos = Math.round((suministros + gestoria + otros) * 0.21);
      const ivaSoportado = ivaSoportadoCompras + ivaSoportadoGastos;
      const resultadoIVA = ivaRepercutido - ivaSoportado;
      // IRPF retenido a empleados
      const irpfRetenido = Math.round(salarioBruto * 0.12);
      const cuotasSS = cuotaEmpresaSS + Math.round(salarioBruto * 0.065); // empresa + trabajador

      // ---- Alertas ----
      const alertas = [];

      if (margenBrutoPct < 22.5) {
        alertas.push({
          tipo: 'danger',
          mensaje: `Margen bruto bajo: ${margenBrutoPct}%. Revisar precios de compra.`
        });
      } else if (margenBrutoPct < 23.0) {
        alertas.push({
          tipo: 'warning',
          mensaje: `Margen bruto ajustado: ${margenBrutoPct}%. Vigilar proveedores.`
        });
      }

      if (suministros > 2_900) {
        alertas.push({
          tipo: 'warning',
          mensaje: `Suministros elevados: ${suministros.toLocaleString('es-ES')}€. Revisar consumo energetico.`
        });
      }

      if (pctPersonalSobreVentas > 16.5) {
        alertas.push({
          tipo: 'warning',
          mensaje: `Coste personal ${pctPersonalSobreVentas}% sobre ventas. Supera umbral 16,5%.`
        });
      }

      if (resultadoNeto < 0) {
        alertas.push({
          tipo: 'danger',
          mensaje: `Resultado neto negativo: ${resultadoNeto.toLocaleString('es-ES')}€.`
        });
      }

      if (saldoBancario < 25_000) {
        alertas.push({
          tipo: 'warning',
          mensaje: `Saldo bancario bajo: ${saldoBancario.toLocaleString('es-ES')}€.`
        });
      }

      if (diasPagoProveedores > 40) {
        alertas.push({
          tipo: 'info',
          mensaje: `Plazo pago proveedores: ${diasPagoProveedores} dias. Negociar mejores condiciones.`
        });
      }

      if (mm === '06' || mm === '12') {
        alertas.push({
          tipo: 'info',
          mensaje: 'Mes con paga extra incluida en coste de personal.'
        });
      }

      datos.push({
        periodo,
        ventas: {
          total: ventasTotal,
          ventasDiasHabiles,
          ticketMedio,
          numeroTickets,
        },
        compras: {
          costeMercancia,
          margenBruto,
          margenBrutoPct,
        },
        personal: {
          costeTotal: costePersonalTotal,
          salarioBruto,
          cuotaEmpresaSS,
          numEmpleados,
          pctSobreVentas: pctPersonalSobreVentas,
        },
        gastos: {
          total: gastosTotal,
          suministros,
          alquiler,
          seguros,
          gestoria,
          otros,
        },
        tesoreria: {
          saldoBancario,
          cobros,
          pagos,
          diasPagoProveedores,
        },
        resultado: {
          bruto: resultadoBruto,
          neto: resultadoNeto,
          pctSobreVentas: pctResultadoSobreVentas,
        },
        fiscal: {
          ivaRepercutido,
          ivaSoportado,
          resultadoIVA,
          irpfRetenido,
          cuotasSS,
        },
        alertas,
      });
    }
  }

  return datos;
}

export const DATOS_EJEMPLO = generarDatos();

// =============================================================================
// Funciones auxiliares
// =============================================================================

/**
 * Devuelve el objeto de un periodo concreto ("2023-01").
 */
export function obtenerPeriodo(periodo) {
  return DATOS_EJEMPLO.find(d => d.periodo === periodo);
}

/**
 * Devuelve los objetos entre dos periodos (inclusive).
 */
export function obtenerRango(desde, hasta) {
  return DATOS_EJEMPLO.filter(d => d.periodo >= desde && d.periodo <= hasta);
}

/**
 * Devuelve los ultimos N periodos.
 */
export function obtenerUltimosPeriodos(n) {
  return DATOS_EJEMPLO.slice(-n);
}

/**
 * Devuelve el mismo mes del ano anterior, si existe.
 */
export function obtenerPeriodoAnterior(periodo) {
  const [y, m] = periodo.split('-');
  const anterior = `${parseInt(y, 10) - 1}-${m}`;
  return DATOS_EJEMPLO.find(d => d.periodo === anterior) || null;
}

/**
 * Formatea un numero como moneda EUR (sin decimales).
 */
export function formatearMoneda(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Formatea un numero como porcentaje con 1 decimal.
 */
export function formatearPct(n) {
  return n.toFixed(1) + '%';
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const NOMBRES_MES_CORTO = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/**
 * Devuelve "Enero 2023" para "2023-01".
 */
export function nombreMes(periodo) {
  const [y, m] = periodo.split('-');
  return `${NOMBRES_MES[parseInt(m, 10) - 1]} ${y}`;
}

/**
 * Devuelve "Ene 23" para "2023-01".
 */
export function nombreMesCorto(periodo) {
  const [y, m] = periodo.split('-');
  return `${NOMBRES_MES_CORTO[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}
