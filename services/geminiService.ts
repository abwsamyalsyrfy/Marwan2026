import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TaskAnalysis } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A short summary of the task in Arabic.",
    },
    complexityScore: {
      type: Type.INTEGER,
      description: "A score from 1 to 10 indicating how complex the task is to automate.",
    },
    estimatedTimeSaved: {
      type: Type.STRING,
      description: "Estimated time saved per week if automated (e.g., '3 ساعات'). in Arabic",
    },
    recommendation: {
      type: Type.STRING,
      description: "Main recommendation: Automate, Delegate, or Simplify. in Arabic",
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Step title in Arabic" },
          description: { type: Type.STRING, description: "Detailed instruction in Arabic" },
          codeSnippet: { type: Type.STRING, description: "Optional code (Python, Excel formula, or Email template) to help." },
          tool: { type: Type.STRING, description: "Recommended tool (e.g. Excel, Python, Zapier)" },
        },
        required: ["title", "description", "tool"],
      },
    },
  },
  required: ["summary", "complexityScore", "estimatedTimeSaved", "recommendation", "steps"],
};

export const analyzeTaskWithGemini = async (
  title: string,
  description: string,
  frequency: string,
  attachment?: { base64: string; mimeType: string }
): Promise<TaskAnalysis> => {
  try {
    let prompt = `
      قم بتحليل هذه المهمة الروتينية للموظف واقترح خطة لترحيلها أو أتمتتها.
      
      عنوان المهمة: ${title}
      الوصف: ${description}
      التكرار: ${frequency}
    `;

    if (attachment) {
      prompt += `
      \n\n
      ملاحظة: لقد أرفق المستخدم ملفاً (صورة، PDF، أو CSV).
      هذا الملف قد يحتوي على جدول مهام، بيانات، أو وصف للإجراءات.
      قم باستخراج المهام من هذا الملف وتحليلها بدقة، واستخدم بنية البيانات الموجودة في الملف لاقتراح حلول مخصصة.
      `;
    }

    prompt += `
      أريدك أن تقترح خطوات عملية للتخلص من عبء هذه المهمة. سواء عن طريق كتابة كود (Python/JS)، معادلات Excel، أو قوالب بريد إلكتروني جاهزة.
      اجعل الرد باللغة العربية وموجه للموظف.
    `;

    const parts: any[] = [{ text: prompt }];

    if (attachment) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.base64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are an expert productivity consultant and automation engineer specializing in helping employees offload routine tasks. You can analyze images of Excel sheets, documents, and workflows to provide specific advice. You speak Arabic fluently.",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(text) as TaskAnalysis;
  } catch (error) {
    console.error("Error analyzing task:", error);
    throw error;
  }
};