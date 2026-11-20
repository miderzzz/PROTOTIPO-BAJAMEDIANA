# psc-ingesta · Pedido Seguro Sport Champion

Módulo de lectura de hojas de cálculo (.xlsx / .csv) y validación de tallas,
nombres y dorsales para pedidos masivos de uniformes.

## Requisitos
Node.js 20 o superior.

## Uso rápido
```bash
npm install
npx tsx src/generar-ejemplos.ts                       # crea archivos de prueba en ./ejemplos
npm run validar -- ejemplos/pedido_con_errores.xlsx   # reporte en consola
npm test                                              # 8 pruebas
npm run server                                        # API en http://localhost:3000
curl -F "archivo=@ejemplos/pedido_correcto.xlsx" http://localhost:3000/api/pedidos/validar
```

## Estructura
| Archivo | Qué hace |
| --- | --- |
| `src/catalogo.ts` | Tallas válidas, alias ("Mediana" → M), reglas de nombre y dorsal, encabezados aceptados |
| `src/normalizar.ts` | Limpieza de celdas, tallas, números y nombres |
| `src/lector.ts` | Lee .xlsx (ExcelJS) y .csv (Papa Parse), encuentra la fila de encabezados y mapea columnas |
| `src/validador.ts` | Reglas por fila + reglas entre filas (dorsal repetido por equipo, filas duplicadas) |
| `src/server.ts` | Endpoint `POST /api/pedidos/validar` (Express + multer) |
| `src/cli.ts` | Validación desde la terminal |
| `schema.sql` | Esquema PostgreSQL de la plataforma |

## Respuesta de la API
- `200` pedido válido, `422` hay errores bloqueantes, `400` archivo ilegible.
- `hallazgos[]`: `{ fila, campo, codigo, severidad, mensaje, valorOriginal, sugerencia }`.
  La `fila` coincide con el número de fila que el cliente ve en Excel.
- `prendas[]`: filas limpias, listas para cotizar.

## Ajustar reglas
Todo está en `src/catalogo.ts`. En producción esas constantes se leen de las
tablas `tallas`, `productos` y `recargos`.
