/**
 * Servidor mínimo para generar recetas con Gemini.
 *
 * Pasos:
 * 1. Instala dependencias:
 *    npm install express cors dotenv @google/generative-ai
 *
 * 2. Crea un archivo .env en este directorio con:
 *    GEMINI_API_KEY=tu_api_key_de_google
 *
 * 3. Ejecuta:
 *    node server.js
 *
 * 4. Abre la app web con un servidor estático (por ejemplo `npx serve .`)
 *    o configura un proxy para que las llamadas a /api/generate-recipe
 *    lleguen a este servidor (puedes usar concurrently, ver abajo).
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const PORT = process.env.PORT || 3001;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Falta GEMINI_API_KEY en el archivo .env');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

function buildPrompt({
  mealType,
  calories,
  protein,
  carbs,
  fats,
  includeIngredients = [],
}) {
  return `
Eres un chef saludable y un nutricionista.
Genera una receta en formato JSON estricto con las siguientes claves:
{
  "title": string,
  "mealType": string,
  "description": string,
  "tags": string[],
  "ingredients": [
    {
      "name": string,
      "quantity": number,
      "unit": "g" | "ml" | "unidad" | "cucharadita" | "cucharada"
    }
  ],
  "steps": string[],
  "macros": { "calories": number, "protein": number|null, "carbs": number|null, "fats": number|null },
  "servings": number
}

Requisitos:
- Todas las medidas de ingredientes deben usar únicamente estas unidades: g, ml, unidad, cucharadita, cucharada. Prohibido usar tazas, piezas, porciones u otras palabras.
- Si el ingrediente es sólido o líquido pesa/volumétrico, usa g o ml.
- Si el ingrediente es una pieza contable (ej: huevo, banana, tomate, pan pita, pechuga, filete), usa la unidad "unidad" y un quantity entero.
- Si la receta requiere cucharadas o cucharaditas exactas, usa las unidades "cucharada" o "cucharadita" con quantity numérico.
- El campo "quantity" siempre debe ser numérico (puede ser decimal) y "unit" debe ser exactamente una de las unidades permitidas.
- Tipo de comida: ${mealType}
- Calorías aproximadas: ${calories}
${protein ? `- Proteínas objetivo: ${protein} g` : ''}
${carbs ? `- Carbohidratos objetivo: ${carbs} g` : ''}
${fats ? `- Grasas objetivo: ${fats} g` : ''}
${includeIngredients.length ? `- Incluir/considerar: ${includeIngredients.join(', ')}` : ''}

La respuesta debe contener únicamente el JSON válido sin comentarios ni texto adicional.
`;
}

app.post('/api/generate-recipe', async (req, res) => {
  try {
    const { mealType, calories, protein, carbs, fats, includeIngredients } = req.body || {};

    if (!mealType || !calories) {
      return res.status(400).json({ error: 'mealType y calories son obligatorios.' });
    }

    const prompt = buildPrompt({
      mealType,
      calories,
      protein,
      carbs,
      fats,
      includeIngredients,
    });

    const result = await model.generateContent(prompt);
    const responseText = result?.response?.text();

    if (!responseText) {
      return res.status(500).json({ error: 'No se obtuvo respuesta del modelo.' });
    }

    res.json({ text: responseText });
  } catch (error) {
    console.error('❌ Error al generar receta IA:', error);
    res.status(500).json({
      error: 'Error al generar la receta. Revisa los logs del servidor.',
      details: error.message,
    });
  }
});

app.get('/api/ping', (_req, res) => {
  res.json({ pong: true });
});

app.use(express.static(__dirname));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor IA escuchando en http://localhost:${PORT}`);
});

/**
 * CONSEJO: puedes lanzar frontend y backend juntos usando concurrently.
 *
 * Ejemplo en package.json:
 * {
 *   "scripts": {
 *     "dev:server": "node server.js",
 *     "dev:web": "npx serve .",
 *     "dev": "concurrently \"npm run dev:server\" \"npm run dev:web\""
 *   }
 * }
 */

