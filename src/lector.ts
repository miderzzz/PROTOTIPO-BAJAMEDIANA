import ExcelJS from "exceljs";
import Papa from "papaparse";
import { COLUMNAS_OBLIGATORIAS, ENCABEZADOS, REGLAS } from "./catalogo.js";
import { celdaATexto, claveEncabezado } from "./normalizar.js";

export type Campo = keyof typeof ENCABEZADOS;

/** Una fila tal como viene del archivo, ya mapeada a campos conocidos. */
export interface FilaCruda {
  fila: number; // número de fila en la hoja (1 = encabezado), para mostrar al cliente
  valores: Partial<Record<Campo, string>>;
}

export interface ResultadoLectura {
  filas: FilaCruda[];
  mapaColumnas: Partial<Record<Campo, string>>; // campo -> encabezado original
  columnasIgnoradas: string[];
  erroresEstructura: string[];
}

export class ErrorArchivo extends Error {}

/** Punto de entrada: decide el lector según la extensión. */
export async function leerHojaDeCalculo(buffer: Buffer, nombreArchivo: string): Promise<ResultadoLectura> {
  const ext = nombreArchivo.toLowerCase().split(".").pop();
  let tabla: string[][];
  if (ext === "xlsx") tabla = await leerXlsx(buffer);
  else if (ext === "csv" || ext === "txt") tabla = leerCsv(buffer);
  else throw new ErrorArchivo(`Formato no soportado (.${ext}). Usa .xlsx o .csv.`);
  return mapearTabla(tabla);
}

async function leerXlsx(buffer: Buffer): Promise<string[][]> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new ErrorArchivo("No se pudo abrir el archivo Excel. ¿Está dañado o protegido con contraseña?");
  }
  // Primera hoja visible con datos (la plantilla trae una hoja de "Ayuda").
  const hoja = libro.worksheets.find((h) => h.state === "visible" && h.actualRowCount > 0);
  if (!hoja) throw new ErrorArchivo("El archivo no tiene hojas con datos.");

  const tabla: string[][] = [];
  hoja.eachRow({ includeEmpty: true }, (row, numeroFila) => {
    const valores: string[] = [];
    for (let c = 1; c <= hoja.columnCount; c++) {
      valores.push(celdaATexto(row.getCell(c).value));
    }
    tabla[numeroFila - 1] = valores;
  });
  // eachRow puede dejar huecos si hay filas vacías intermedias.
  return Array.from(tabla, (f) => f ?? []);
}

function leerCsv(buffer: Buffer): string[][] {
  let texto = buffer.toString("utf8");
  // Excel en Windows suele exportar CSV en Windows-1252: si hay caracteres
  // inválidos de UTF-8, se reintenta como latin1.
  if (texto.includes("�")) texto = buffer.toString("latin1");
  texto = texto.replace(/^﻿/, ""); // BOM

  const resultado = Papa.parse<string[]>(texto, {
    delimiter: "", // autodetecta "," o ";" (Excel en español usa ";")
    skipEmptyLines: false,
  });
  if (resultado.errors.some((e) => e.type === "Delimiter")) {
    throw new ErrorArchivo("No se reconoció el separador del CSV. Usa coma o punto y coma.");
  }
  return resultado.data;
}

/** Encuentra la fila de encabezados, mapea columnas y arma las filas. */
export function mapearTabla(tabla: string[][]): ResultadoLectura {
  const erroresEstructura: string[] = [];

  // El encabezado puede no estar en la fila 1 (logos, títulos): se busca
  // en las primeras 10 filas la que reconozca más columnas obligatorias.
  let filaEncabezado = -1;
  let mejor = 0;
  let mapaIndices: Partial<Record<Campo, number>> = {};
  for (let i = 0; i < Math.min(10, tabla.length); i++) {
    const mapa = mapearEncabezados(tabla[i] ?? []);
    const reconocidas = COLUMNAS_OBLIGATORIAS.filter((c) => mapa[c] !== undefined).length;
    if (reconocidas > mejor) {
      mejor = reconocidas;
      filaEncabezado = i;
      mapaIndices = mapa;
    }
  }
  if (filaEncabezado === -1) {
    throw new ErrorArchivo("No se encontraron las columnas Nombre, Número y Talla. Descarga la plantilla oficial.");
  }

  const encabezados = tabla[filaEncabezado].map((h) => h.trim());
  for (const col of COLUMNAS_OBLIGATORIAS) {
    if (mapaIndices[col] === undefined) erroresEstructura.push(`Falta la columna obligatoria "${col}".`);
  }

  const mapaColumnas: Partial<Record<Campo, string>> = {};
  for (const [campo, idx] of Object.entries(mapaIndices)) {
    mapaColumnas[campo as Campo] = encabezados[idx as number];
  }
  const usados = new Set(Object.values(mapaIndices));
  const columnasIgnoradas = encabezados.filter((h, i) => h && !usados.has(i));

  const filas: FilaCruda[] = [];
  for (let i = filaEncabezado + 1; i < tabla.length; i++) {
    const celdas = tabla[i] ?? [];
    const valores: Partial<Record<Campo, string>> = {};
    for (const [campo, idx] of Object.entries(mapaIndices)) {
      valores[campo as Campo] = (celdas[idx as number] ?? "").trim();
    }
    // Se saltan filas totalmente vacías (muy comunes al final del Excel).
    if (Object.values(valores).every((v) => !v)) continue;
    filas.push({ fila: i + 1, valores });
  }

  if (filas.length === 0) erroresEstructura.push("El archivo no tiene filas con datos.");
  if (filas.length > REGLAS.maxFilas) {
    erroresEstructura.push(`El archivo tiene ${filas.length} filas; el máximo por carga es ${REGLAS.maxFilas}.`);
  }

  return { filas, mapaColumnas, columnasIgnoradas, erroresEstructura };
}

function mapearEncabezados(fila: string[]): Partial<Record<Campo, number>> {
  const mapa: Partial<Record<Campo, number>> = {};
  fila.forEach((celda, idx) => {
    const clave = claveEncabezado(celda ?? "");
    if (!clave) return;
    for (const [campo, alias] of Object.entries(ENCABEZADOS) as [Campo, string[]][]) {
      if (mapa[campo] === undefined && alias.includes(clave)) {
        mapa[campo] = idx;
        break;
      }
    }
  });
  return mapa;
}
