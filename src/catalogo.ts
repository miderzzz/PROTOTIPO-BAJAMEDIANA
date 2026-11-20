/**
 * Catálogo de reglas de negocio.
 * En producción estos valores salen de las tablas `tallas`, `productos`
 * y `recargos`; aquí van como constantes para que el módulo sea autocontenido.
 */

export const TALLAS_VALIDAS = [
  // Infantil
  "4", "6", "8", "10", "12", "14", "16",
  // Adulto
  "XS", "S", "M", "L", "XL", "XXL", "XXXL",
] as const;

export type Talla = (typeof TALLAS_VALIDAS)[number];

/**
 * Variantes que la gente escribe en la vida real -> talla canónica.
 * Las claves ya vienen normalizadas (mayúsculas, sin tildes ni espacios).
 */
export const ALIAS_TALLAS: Record<string, Talla> = {
  EXTRASMALL: "XS", XSMALL: "XS",
  SMALL: "S", PEQUENA: "S", PEQUENO: "S", P: "S",
  MEDIUM: "M", MEDIANA: "M", MEDIANO: "M", MED: "M",
  LARGE: "L", GRANDE: "L", G: "L",
  XLARGE: "XL", EXTRALARGE: "XL", EXTRAGRANDE: "XL", XG: "XL",
  "2XL": "XXL", XXG: "XXL",
  "3XL": "XXXL", XXXG: "XXXL",
  T4: "4", T6: "6", T8: "8", T10: "10", T12: "12", T14: "14", T16: "16",
};

export const REGLAS = {
  nombre: {
    obligatorio: true,
    maxCaracteres: 12,
    // Letras (incluye tildes y Ñ), espacio, punto, guion y apóstrofe.
    patronPermitido: /^[A-ZÁÉÍÓÚÜÑ .'-]+$/,
  },
  numero: {
    obligatorio: true,
    min: 0,
    max: 99,
  },
  maxFilas: 2000,
} as const;

/**
 * Encabezados aceptados por columna. Se comparan ya normalizados
 * (minúsculas, sin tildes, sin signos), así "N°", "No.", "Dorsal" o
 * "Número" apuntan todos a `numero`.
 */
export const ENCABEZADOS: Record<"nombre" | "numero" | "talla" | "equipo" | "producto", string[]> = {
  nombre: ["nombre", "nombre camiseta", "nombre estampado", "jugador", "name"],
  numero: ["numero", "n", "no", "nro", "num", "dorsal", "number", "#"],
  talla: ["talla", "size", "talla camiseta"],
  equipo: ["equipo", "categoria", "team", "grupo"],
  producto: ["producto", "prenda", "item", "referencia"],
};

export const COLUMNAS_OBLIGATORIAS = ["nombre", "numero", "talla"] as const;
