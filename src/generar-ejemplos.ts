/** Genera archivos de prueba en ./ejemplos (uno correcto y uno con errores típicos). */
import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("ejemplos", { recursive: true });

async function crearXlsx(ruta: string, filas: (string | number)[][]) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Pedido");
  hoja.addRow(["Listado de uniformes - Colegio San José"]); // título encima del encabezado
  hoja.addRow([]);
  hoja.addRow(["Nombre", "N°", "Talla", "Categoría", "Observaciones"]);
  filas.forEach((f) => hoja.addRow(f));
  const ayuda = libro.addWorksheet("Ayuda");
  ayuda.addRow(["Tallas válidas: 4, 6, 8, 10, 12, 14, 16, XS, S, M, L, XL, XXL, XXXL"]);
  await libro.xlsx.writeFile(ruta);
}

await crearXlsx("ejemplos/pedido_correcto.xlsx", [
  ["Juan Pérez", 10, "M", "Sub-15", ""],
  ["Andrés Gómez", 7, "L", "Sub-15", ""],
  ["Camilo Núñez", 1, "S", "Sub-15", "arquero"],
  ["Sofía Peña", 10, "14", "Sub-12", ""],
]);

await crearXlsx("ejemplos/pedido_con_errores.xlsx", [
  ["Juan Pérez", 10, "m", "Sub-15", ""], // talla en minúscula -> advertencia
  ["Andrés Gómez", 10, "L", "Sub-15", ""], // dorsal repetido con la fila anterior
  ["María Fernanda Rodríguez", 5, "S", "Sub-15", ""], // nombre largo
  ["Pipe ⚽", 23, "XL", "Sub-15", ""], // emoji no estampable
  ["Luis Díaz", "07", "Mediana", "Sub-15", ""], // cero inicial + alias de talla
  ["Carlos Ruiz", 120, "M", "Sub-15", ""], // fuera de rango
  ["Tomás Ríos", "diez", "XXXXL", "Sub-15", ""], // número y talla inválidos
  ["", 9, "L", "Sub-15", ""], // nombre vacío
  ["Sofía Peña", 10, "14", "Sub-12", ""], // mismo dorsal, otro equipo -> OK
]);

await writeFile(
  "ejemplos/pedido_excel_es.csv",
  Buffer.from("Nombre;Dorsal;Talla;Equipo\r\nJosé Muñoz;9;2XL;Mayores\r\nIván Ortiz;11;xg;Mayores\r\n", "latin1"),
);

console.log("Ejemplos generados en ./ejemplos");
