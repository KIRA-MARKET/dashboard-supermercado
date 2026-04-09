import Dexie from 'dexie';

export const db = new Dexie('DashboardSupermercado');

db.version(1).stores({
  periodos: 'periodo', // '2025-03'
  documentos: '++id, periodo, tipo, fechaCarga',
  conversaciones: '++id, fecha',
});

// Guardar datos de un período
export async function guardarPeriodo(periodo, datos) {
  await db.periodos.put({ periodo, ...datos, updatedAt: new Date().toISOString() });
}

// Obtener datos de un período
export async function obtenerPeriodo(periodo) {
  return db.periodos.get(periodo);
}

// Obtener todos los períodos
export async function obtenerTodosPeriodos() {
  return db.periodos.toArray();
}

// Guardar documento procesado
export async function guardarDocumento(doc) {
  return db.documentos.add({ ...doc, fechaCarga: new Date().toISOString() });
}

// Obtener documentos de un período
export async function obtenerDocumentos(periodo) {
  return db.documentos.where('periodo').equals(periodo).toArray();
}
