/**
 * Endpoint mínimo de carga. En la arquitectura final esto vive en un
 * controlador de NestJS (`POST /pedidos/:id/cargas`); aquí se usa Express
 * para que el ejemplo corra solo.
 *
 *   curl -F "archivo=@ejemplos/pedido_con_errores.xlsx" http://localhost:3000/api/pedidos/validar
 */
import express from "express";
import multer from "multer";
import { ErrorArchivo, leerHojaDeCalculo } from "./lector.js";
import { PAGINA_CARGA } from "./pagina.js";
import { validarPedido } from "./validador.js";

// Vercel limita el cuerpo de la petición a 4.5 MB.
const MAX_MB = 4;
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /\.(xlsx|csv)$/i.test(file.originalname)),
});

const app = express();

// Página para subir el archivo desde el navegador.
app.get("/", (_req, res) => {
  res.type("html").send(PAGINA_CARGA);
});

app.post("/api/pedidos/validar", subida.single("archivo"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: `Adjunta un archivo .xlsx o .csv de máximo ${MAX_MB} MB en el campo "archivo".` });
    return;
  }
  try {
    const lectura = await leerHojaDeCalculo(req.file.buffer, req.file.originalname);
    const resultado = validarPedido(lectura);
    // Siguiente paso real: guardar el archivo en S3, la carga en `cargas_archivo`,
    // los hallazgos en `errores_validacion` y, si es válido, encolar la cotización.
    res.status(resultado.valido ? 200 : 422).json({
      mapaColumnas: lectura.mapaColumnas,
      columnasIgnoradas: lectura.columnasIgnoradas,
      ...resultado,
    });
  } catch (e) {
    if (e instanceof ErrorArchivo) {
      res.status(400).json({ error: e.message });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Error inesperado procesando el archivo." });
  }
});

// En Vercel la app se exporta y Vercel la ejecuta como función;
// en tu computador se levanta con app.listen.
if (!process.env.VERCEL) {
  const puerto = Number(process.env.PORT ?? 3000);
  app.listen(puerto, () => console.log(`Abre http://localhost:${puerto} en el navegador para validar un pedido`));
}

export default app;
