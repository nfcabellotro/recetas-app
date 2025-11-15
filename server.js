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
  "servings": number,
  "prepTime": number
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

- El campo "prepTime" debe ser el tiempo aproximado de preparación en minutos (número entero).
- Calcula el tiempo considerando: preparación de ingredientes, cocción, y cualquier otro paso necesario.

La respuesta debe contener únicamente el JSON válido sin comentarios ni texto adicional.
`;
}

function buildMacrosPrompt(ingredients, includeCalories = false) {
  const ingredientsList = ingredients.map(ing => {
    const qty = ing.quantity || '';
    const unit = ing.unit || '';
    return `${ing.name}: ${qty} ${unit}`;
  }).join(', ');

  const caloriesField = includeCalories ? ',\n  "calories": number' : '';
  const caloriesNote = includeCalories ? ' y calorías totales' : '';

  return `
Eres un nutricionista experto.
Calcula los macronutrientes${caloriesNote} para la siguiente lista de ingredientes.
Debes calcular el total considerando las cantidades especificadas.

Ingredientes: ${ingredientsList}

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "protein": number,
  "carbs": number,
  "fats": number${caloriesField}
}

Los valores deben ser números (pueden ser decimales para macronutrientes, entero para calorías). Si no puedes calcular algún valor, usa 0.
No incluyas comentarios ni texto adicional, solo el JSON.
`;
}

function buildCaloriesPrompt(ingredients) {
  const ingredientsList = ingredients.map(ing => {
    const qty = ing.quantity || '';
    const unit = ing.unit || '';
    return `${ing.name}: ${qty} ${unit}`;
  }).join(', ');

  return `
Eres un nutricionista experto.
Calcula las calorías totales para la siguiente lista de ingredientes.
Debes calcular el total considerando las cantidades especificadas.

Ingredientes: ${ingredientsList}

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "calories": number
}

El valor debe ser un número entero. Si no puedes calcular el valor, usa 0.
No incluyas comentarios ni texto adicional, solo el JSON.
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

app.post('/api/calculate-macros', async (req, res) => {
  try {
    const { ingredients, includeCalories = false } = req.body || {};

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de ingredientes.' });
    }

    const prompt = buildMacrosPrompt(ingredients, includeCalories);
    const result = await model.generateContent(prompt);
    const responseText = result?.response?.text();

    if (!responseText) {
      return res.status(500).json({ error: 'No se obtuvo respuesta del modelo.' });
    }

    res.json({ text: responseText });
  } catch (error) {
    console.error('❌ Error al calcular macronutrientes:', error);
    res.status(500).json({
      error: 'Error al calcular macronutrientes. Revisa los logs del servidor.',
      details: error.message,
    });
  }
});

app.post('/api/calculate-calories', async (req, res) => {
  try {
    const { ingredients } = req.body || {};

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de ingredientes.' });
    }

    const prompt = buildCaloriesPrompt(ingredients);
    const result = await model.generateContent(prompt);
    const responseText = result?.response?.text();

    if (!responseText) {
      return res.status(500).json({ error: 'No se obtuvo respuesta del modelo.' });
    }

    res.json({ text: responseText });
  } catch (error) {
    console.error('❌ Error al calcular calorías:', error);
    res.status(500).json({
      error: 'Error al calcular calorías. Revisa los logs del servidor.',
      details: error.message,
    });
  }
});

function buildTDEEPrompt({ weight, height, age, gender, exerciseLevel }) {
  const exerciseLevels = {
    sedentary: 'sedentario (poco o ningún ejercicio)',
    light: 'ligera (ejercicio ligero 1-3 días por semana)',
    moderate: 'moderada (ejercicio moderado 3-5 días por semana)',
    active: 'activa (ejercicio intenso 6-7 días por semana)',
    very_active: 'muy activa (ejercicio muy intenso, trabajo físico)'
  };

  return `
Eres un nutricionista experto.
Calcula el TMB (Tasa Metabólica Basal) y TDEE (Gasto Energético Total Diario) para una persona con las siguientes características:

- Peso: ${weight} kg
- Estatura: ${height} cm
- Edad: ${age} años
- Sexo: ${gender === 'male' ? 'Masculino' : 'Femenino'}
- Nivel de actividad: ${exerciseLevels[exerciseLevel] || exerciseLevel}

El TMB debe calcularse usando la ecuación de Mifflin-St Jeor:
- Hombres: TMB = 10 × peso(kg) + 6.25 × estatura(cm) - 5 × edad(años) + 5
- Mujeres: TMB = 10 × peso(kg) + 6.25 × estatura(cm) - 5 × edad(años) - 161

El TDEE debe calcularse multiplicando el TMB por el factor de actividad correspondiente al nivel de ejercicio.

Factores de actividad aproximados:
- Sedentario: 1.2
- Ligera: 1.375
- Moderada: 1.55
- Activa: 1.725
- Muy activa: 1.9

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "tmb": number,
  "tdee": number
}

Los valores deben ser números enteros (calorías por día).
No incluyas comentarios ni texto adicional, solo el JSON.
`;
}

app.post('/api/calculate-tdee', async (req, res) => {
  try {
    const { weight, height, age, gender, exerciseLevel } = req.body || {};

    if (!weight || !height || !age || !gender || !exerciseLevel) {
      return res.status(400).json({ error: 'Se requieren peso, estatura, edad, sexo y nivel de ejercicio.' });
    }

    const prompt = buildTDEEPrompt({ weight, height, age, gender, exerciseLevel });
    const result = await model.generateContent(prompt);
    const responseText = result?.response?.text();

    if (!responseText) {
      return res.status(500).json({ error: 'No se obtuvo respuesta del modelo.' });
    }

    res.json({ text: responseText });
  } catch (error) {
    console.error('❌ Error al calcular TDEE/TMB:', error);
    res.status(500).json({
      error: 'Error al calcular TDEE/TMB. Revisa los logs del servidor.',
      details: error.message,
    });
  }
});

function buildMealPlanPrompt({ calories, protein, carbs, fats, mealTypes, availableFoods }) {
  const foodsList = availableFoods.join(', ');
  const mealTypesList = mealTypes.join(', ');

  return `
Eres un nutricionista experto. Genera un plan semanal de comidas (7 días) que cumpla con los siguientes objetivos nutricionales diarios:

- Calorías totales por día: ${calories} kcal
- Proteínas: ${protein} g
- Carbohidratos: ${carbs} g
- Grasas: ${fats} g

Tipos de comidas a incluir: ${mealTypesList}

Alimentos disponibles (SOLO puedes usar estos):
${foodsList}

IMPORTANTE:
1. El plan debe ser para 7 días (Lunes a Domingo)
2. Cada día debe cumplir aproximadamente con las calorías y macronutrientes especificados
3. Distribuye las calorías entre los tipos de comidas seleccionados
4. SOLO usa los alimentos de la lista disponible
5. Para cada comida, especifica ingredientes con cantidades en gramos/ml/unidades/cucharaditas
6. Calcula y muestra las calorías y macronutrientes aproximados de cada comida

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "days": [
    {
      "day": "Lunes",
      "meals": [
        {
          "type": "Desayuno",
          "name": "Nombre de la comida",
          "description": "Descripción detallada de la preparación",
          "ingredients": [
            {
              "name": "Pollo",
              "quantity": 200,
              "unit": "g"
            },
            {
              "name": "Arroz",
              "quantity": 150,
              "unit": "g"
            }
          ],
          "calories": 500,
          "protein": 25,
          "carbs": 60,
          "fats": 15
        },
        {
          "type": "Almuerzo",
          "name": "Nombre de la comida",
          "description": "Descripción detallada de la preparación",
          "ingredients": [
            {
              "name": "Pescado",
              "quantity": 250,
              "unit": "g"
            },
            {
              "name": "Papa",
              "quantity": 200,
              "unit": "g"
            }
          ],
          "calories": 700,
          "protein": 40,
          "carbs": 80,
          "fats": 20
        }
      ]
    },
    {
      "day": "Martes",
      "meals": [...]
    }
    ... (repetir para los 7 días)
  ]
}

IMPORTANTE: Cada comida DEBE incluir un array "ingredients" con todos los ingredientes usados, cada uno con:
- "name": nombre del ingrediente
- "quantity": cantidad numérica
- "unit": unidad (g, kg, ml, l, unidad, cucharada, cucharadita)

Asegúrate de que la suma de calorías y macronutrientes de todas las comidas del día se acerque a los objetivos diarios.
No incluyas comentarios ni texto adicional, solo el JSON.
`;
}

app.post('/api/generate-meal-plan', async (req, res) => {
  try {
    const { calories, protein, carbs, fats, mealTypes, availableFoods } = req.body || {};

    if (!calories || !protein || !carbs || !fats) {
      return res.status(400).json({ error: 'Se requieren calorías y macronutrientes.' });
    }

    if (!mealTypes || !Array.isArray(mealTypes) || mealTypes.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un tipo de comida.' });
    }

    if (!availableFoods || !Array.isArray(availableFoods) || availableFoods.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un alimento disponible.' });
    }

    const prompt = buildMealPlanPrompt({ calories, protein, carbs, fats, mealTypes, availableFoods });
    const result = await model.generateContent(prompt);
    const responseText = result?.response?.text();

    if (!responseText) {
      return res.status(500).json({ error: 'No se obtuvo respuesta del modelo.' });
    }

    res.json({ text: responseText });
  } catch (error) {
    console.error('❌ Error al generar plan de comidas:', error);
    res.status(500).json({
      error: 'Error al generar plan de comidas. Revisa los logs del servidor.',
      details: error.message,
    });
  }
});

app.get('/api/ping', (_req, res) => {
  res.json({ pong: true });
});

// Servir archivos estáticos desde la carpeta web
app.use(express.static(path.join(__dirname, 'web')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'index.html'));
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

