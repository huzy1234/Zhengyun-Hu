import { GoogleGenAI, Type } from "@google/genai";
import { PEDIBGA_SYSTEM_INSTRUCTION } from "../constants";
import { AppState, BloodGasValues } from "../types";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Initialize Gemini Client
const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is missing. Please ensure process.env.API_KEY is available.");
    }
    return new GoogleGenAI({ apiKey });
}

export const extractDataFromImage = async (base64Image: string): Promise<Partial<BloodGasValues>> => {
  const ai = getClient();

  const prompt = `
    Analyze this medical blood gas report image. 
    Identify the "Patient Result" or "Measured Value" column. Ignore "Reference Range" columns.
    
    Extract the following values. If a value is not found, return null.
    - pH
    - pCO2 (or PaCO2)
    - pO2 (or PaO2)
    - HCO3 (or HCO3-, Bicarbonate)
    - BE (Base Excess, BE(B), or BE(ecf))
    - Lactate (Lac)
    - Na (Sodium)
    - K (Potassium)
    - Cl (Chloride)
    - Glucose (Glu)
    - Albumin (Alb) - Note: If unit is g/L, convert to g/dL (divide by 10).
    
    Return the result strictly as a JSON object with the specified keys.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded for JSON schema support and better OCR
      contents: {
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                pH: { type: Type.STRING, description: "pH value" },
                pCO2: { type: Type.STRING, description: "pCO2 value in mmHg" },
                pO2: { type: Type.STRING, description: "pO2 value in mmHg" },
                HCO3: { type: Type.STRING, description: "HCO3 value in mmol/L" },
                BE: { type: Type.STRING, description: "Base Excess value in mmol/L" },
                Lactate: { type: Type.STRING, description: "Lactate value in mmol/L" },
                Na: { type: Type.STRING, description: "Sodium value in mmol/L" },
                K: { type: Type.STRING, description: "Potassium value in mmol/L" },
                Cl: { type: Type.STRING, description: "Chloride value in mmol/L" },
                Glucose: { type: Type.STRING, description: "Glucose value in mmol/L" },
                Albumin: { type: Type.STRING, description: "Albumin value in g/dL" }
            }
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as Partial<BloodGasValues>;
    }
    return {};

  } catch (error) {
    console.error("OCR Error:", error);
    // Return empty object instead of throwing to allow manual fallback gracefully if needed, 
    // but throwing communicates the error to the UI as requested.
    throw new Error("Failed to extract data from image. JSON mode may not be supported or image is unclear.");
  }
};

export const extractDataFromText = async (text: string): Promise<Partial<BloodGasValues>> => {
  const ai = getClient();

  const prompt = `
    Analyze the following text containing medical blood gas results.
    The text might be unstructured, copied from a report, or just a list of numbers.
    Extract the following values. If a value is not found, return null.
    
    Text content:
    """
    ${text}
    """
    
    Target Fields:
    - pH
    - pCO2 (or PaCO2)
    - pO2 (or PaO2)
    - HCO3 (or HCO3-, Bicarbonate)
    - BE (Base Excess)
    - Lactate (Lac)
    - Na (Sodium)
    - K (Potassium)
    - Cl (Chloride)
    - Glucose (Glu)
    - Albumin (Alb) - Note: If unit is g/L, convert to g/dL (divide by 10).
    
    Return the result strictly as a JSON object with the specified keys.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                pH: { type: Type.STRING, description: "pH value" },
                pCO2: { type: Type.STRING, description: "pCO2 value in mmHg" },
                pO2: { type: Type.STRING, description: "pO2 value in mmHg" },
                HCO3: { type: Type.STRING, description: "HCO3 value in mmol/L" },
                BE: { type: Type.STRING, description: "Base Excess value in mmol/L" },
                Lactate: { type: Type.STRING, description: "Lactate value in mmol/L" },
                Na: { type: Type.STRING, description: "Sodium value in mmol/L" },
                K: { type: Type.STRING, description: "Potassium value in mmol/L" },
                Cl: { type: Type.STRING, description: "Chloride value in mmol/L" },
                Glucose: { type: Type.STRING, description: "Glucose value in mmol/L" },
                Albumin: { type: Type.STRING, description: "Albumin value in g/dL" }
            }
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as Partial<BloodGasValues>;
    }
    return {};
  } catch (error) {
    console.error("Text Extraction Error:", error);
    throw new Error("Failed to extract data from text.");
  }
};

export const generatePediReport = async (state: AppState): Promise<string> => {
    const ai = getClient();
    
    // Construct the context based on gathered state
    let context = "";
    
    if (state.scenario === 'A') {
        context += `SCENARIO: A (UABGA - Neonatal)\n`;
        context += `Patient Details: ${JSON.stringify(state.uabgaData, null, 2)}\n`;
    } else {
        context += `SCENARIO: B (General Pediatric/Neonatal ABG)\n`;
        context += `Patient Details: ${JSON.stringify(state.generalData, null, 2)}\n`;
    }

    context += `\nBLOOD GAS MEASUREMENTS:\n${JSON.stringify(state.bloodGasValues, null, 2)}\n`;
    context += `\nINSTRUCTION: Perform the 6-step analysis and generate the full Markdown report in Chinese as defined in your System Instruction.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Upgraded for better medical reasoning
            contents: [
                { text: context }
            ],
            config: {
                systemInstruction: PEDIBGA_SYSTEM_INSTRUCTION,
                temperature: 0.4,
            }
        });

        return response.text || "Report generation failed. Please try again.";
    } catch (error) {
        console.error("Analysis Error:", error);
        throw new Error("Failed to generate report.");
    }
}
