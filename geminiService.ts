
import { GoogleGenAI, Type, Modality } from "@google/genai";

// [FIX] Implemented missing searchUniversalFood with proper JSON schema as per coding guidelines
export async function searchUniversalFood(query: string): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Retrieve precision nutritional data for the following food: ${query}. Focus on accuracy for fitness tracking.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Common name of the food item" },
          calories: { type: Type.NUMBER, description: "Total calories per standard serving" },
          protein: { type: Type.NUMBER, description: "Grams of protein" },
          carbs: { type: Type.NUMBER, description: "Grams of carbohydrates" },
          fats: { type: Type.NUMBER, description: "Grams of fats" },
          servingSize: { type: Type.STRING, description: "Standard serving size description" }
        },
        required: ["name", "calories", "protein", "carbs", "fats", "servingSize"]
      }
    }
  });
  return JSON.parse(response.text.trim());
}

// [FIX] Implemented missing analyzeMealPhoto with vision capabilities and JSON schema
export async function analyzeMealPhoto(base64: string): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64 } },
        { text: "Analyze this meal photo and provide the total nutritional breakdown. Estimate quantities accurately." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Identified meal name" },
          calories: { type: Type.NUMBER, description: "Estimated total calories" },
          protein: { type: Type.NUMBER, description: "Estimated total protein in grams" },
          carbs: { type: Type.NUMBER, description: "Estimated total carbohydrates in grams" },
          fats: { type: Type.NUMBER, description: "Estimated total fats in grams" }
        },
        required: ["name", "calories", "protein", "carbs", "fats"]
      }
    }
  });
  return JSON.parse(response.text.trim());
}

// [FIX] Updated to use responseSchema for reliable JSON generation instead of string prompts
export async function generatePersonalizedPlan(data: any): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const age = data.dob ? new Date().getFullYear() - new Date(data.dob).getFullYear() : 30;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `You are the Head Coach at MUSKYFIT, elite fitness consultancy for Asian Men.
    Client Profile: ${data.name}, Age: ${age}, Gender: ${data.gender}, Goal: ${data.goal}, Diet: ${data.dietPreference}.
    Requirements: Bespoke 12-week protocol including Asian-fusion high-protein nutrition and executive-level training split.`,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          trainingDayMacros: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              p: { type: Type.NUMBER },
              c: { type: Type.NUMBER },
              f: { type: Type.NUMBER }
            },
            required: ["calories", "p", "c", "f"]
          },
          restDayMacros: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              p: { type: Type.NUMBER },
              c: { type: Type.NUMBER },
              f: { type: Type.NUMBER }
            },
            required: ["calories", "p", "c", "f"]
          },
          mealPlan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                mealType: { type: Type.STRING },
                name: { type: Type.STRING },
                ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                instructions: { type: Type.STRING },
                macros: {
                  type: Type.OBJECT,
                  properties: {
                    calories: { type: Type.NUMBER },
                    p: { type: Type.NUMBER },
                    c: { type: Type.NUMBER },
                    f: { type: Type.NUMBER }
                  },
                  required: ["calories", "p", "c", "f"]
                }
              },
              required: ["mealType", "name", "ingredients", "instructions", "macros"]
            }
          },
          workoutSplit: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                day: { type: Type.STRING },
                title: { type: Type.STRING },
                exercises: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      sets: { type: Type.NUMBER },
                      reps: { type: Type.STRING },
                      notes: { type: Type.STRING }
                    },
                    required: ["id", "name", "sets", "reps", "notes"]
                  }
                }
              },
              required: ["id", "day", "title", "exercises"]
            }
          },
          coachAdvice: { type: Type.STRING }
        },
        required: ["trainingDayMacros", "restDayMacros", "mealPlan", "workoutSplit", "coachAdvice"]
      }
    }
  });
  return JSON.parse(response.text.trim());
}

export async function groundedConciergeChat(prompt: string, context: string): Promise<{ text: string, sources: any[] }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Context: ${context}\n\nClient: ${prompt}`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are the MUSKYFIT Head Coach. You provide direct, world-class advice focused on Asian physical transformation and executive performance."
    },
  });
  return { 
    text: response.text || "", 
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
  };
}

// [FIX] Updated model to gemini-2.5-flash for Maps grounding support as per guidelines
export async function findEliteResources(query: string, latitude: number, longitude: number): Promise<{ text: string, sources: any[] }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Locate high-end resources for: ${query}`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: { latLng: { latitude, longitude } }
      }
    },
  });
  return { 
    text: response.text || "", 
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
  };
}

export async function generateGoalVisualization(goal: string, biometrics: string, gender: string = "male", age: number = 30): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: `Hyper-realistic aesthetic visualization of a successful Asian ${gender} with elite physique. Achieving: ${goal}. Background: Luxury high-tech gym.` }] },
    config: { imageConfig: { aspectRatio: "3:4", imageSize: "1K" } }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
}

export async function generateWeeklyAudioBriefing(text: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
}

// [FIX] Implemented manual encode function following coding guidelines
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// [FIX] Implemented manual decode function following coding guidelines
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// [FIX] Updated encodePCM to use the guideline-compliant manual encode function
export function encodePCM(data: Float32Array): string {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return encode(new Uint8Array(int16.buffer));
}

// [FIX] Corrected decodeAudioData to handle raw PCM streams as per guidelines
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export async function connectLiveCoach(callbacks: any): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
      systemInstruction: 'You are the MUSKYFIT Head Coach. Focus on high-performance coaching for Asian professionals.',
    },
  });
}
