
import { GoogleGenAI, Type } from "@google/genai";
import { DeliveryStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateTrackingMessage(status: DeliveryStatus, customerName: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Crie uma mensagem curta e amigável em português para o cliente ${customerName} informando que o status do seu pedido é ${status}.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Status atualizado com sucesso.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Seu pedido está atualmente como ${status}.`;
  }
}

export async function parseExcelData(rawData: any[]): Promise<any[]> {
  // Use Gemini to clean or structure potentially messy data from Excel
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise estes dados brutos de uma planilha e transforme em um JSON estruturado com os campos: orderNumber, customerName, address, driverName. Dados: ${JSON.stringify(rawData.slice(0, 10))}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              orderNumber: { type: Type.STRING },
              customerName: { type: Type.STRING },
              address: { type: Type.STRING },
              driverName: { type: Type.STRING },
            },
            required: ["orderNumber", "customerName", "address", "driverName"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return rawData;
  }
}
