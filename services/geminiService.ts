
import { GoogleGenAI, Type } from "@google/genai";
import { TaskAnalysis, NAAnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Defining schemas as objects to follow guidelines and avoid deprecated SchemaType/Schema imports
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    complexityScore: { type: Type.INTEGER },
    estimatedTimeSaved: { type: Type.STRING },
    recommendation: { type: Type.STRING },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          codeSnippet: { type: Type.STRING },
          tool: { type: Type.STRING },
        },
        required: ["title", "description", "tool"],
      },
    },
  },
  required: ["summary", "complexityScore", "estimatedTimeSaved", "recommendation", "steps"],
};

const naAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    reason: { type: Type.STRING, description: "السبب المحتمل لعدم انطباق المهمة بشكل متكرر بالعربية" },
    suggestion: { type: Type.STRING, description: "اقتراح لتحسين المهمة أو استبدالها بالعربية" },
    alternativeTasks: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "قائمة بمهام بديلة أكثر فاعلية"
    }
  },
  required: ["reason", "suggestion", "alternativeTasks"]
};

export const analyzeTaskWithGemini = async (
  title: string,
  description: string,
  frequency: string,
  attachment?: { base64: string; mimeType: string }
): Promise<TaskAnalysis> => {
  try {
    let prompt = `تحليل مهمة روتينية: ${title}. الوصف: ${description}. التكرار: ${frequency}. اقترح خطة أتمتة بالعربية.`;
    const parts: any[] = [{ text: prompt }];
    if (attachment) {
      parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.base64 } });
    }
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "أنت خبير في الإنتاجية والأتمتة. ساعد الموظف في التخلص من المهام الروتينية.",
      },
    });
    // response.text is a property, handled correctly here.
    return JSON.parse(response.text || '{}') as TaskAnalysis;
  } catch (error) {
    console.error("Error analyzing task:", error);
    throw error;
  }
};

export const analyzeNATasks = async (tasksList: string[]): Promise<NAAnalysisResult> => {
  try {
    const prompt = `هذه المهام يتم تعليمها كـ "لا تنطبق" بشكل متكرر: ${tasksList.join(', ')}. حلل لماذا قد لا تنطبق واقترح بدائل أو تحديثات لهذه المهام لتكون أكثر نفعاً للمؤسسة.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: naAnalysisSchema,
        systemInstruction: "أنت مستشار إداري ذكي. حلل المهام غير المفيدة واقترح تحسينات بالعربية.",
      },
    });
    // Using .text property to extract content
    return JSON.parse(response.text || '{}') as NAAnalysisResult;
  } catch (error) {
    console.error("Error analyzing NA tasks:", error);
    throw error;
  }
};
