
import { GoogleGenAI, Type } from "@google/genai";
import { TaskLog, TeamInsight, Employee, TaskAnalysis } from '../types';

/**
 * Fetches strategic insights about team performance based on task logs.
 */
export const getTeamPerformanceInsights = async (
  logs: TaskLog[],
  employees: Employee[]
): Promise<TeamInsight> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const logsSummary = logs.map(l => ({
    emp: employees.find(e => e.id === l.employeeId)?.name || l.employeeId,
    type: l.taskType,
    desc: l.description,
    status: l.status
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        role: 'user',
        parts: [{
          text: `حلل سجلات المهام التالية لفريق العمل وقدم تقريراً استراتيجياً:
          ${JSON.stringify(logsSummary.slice(0, 50))}
          
          المطلوب:
          1. ملخص عام للأداء.
          2. تحديد أي عقبات أو تأخيرات.
          3. والأهم: ابحث في "المهام الإضافية" (Extra) المتكررة واقترح ترحيلها لتصبح "مهام روتينية ثابتة" إذا كانت تبدو أساسية ومهمة للعمل.
          
          اجعل الرد باللغة العربية وفي صيغة JSON فقط.`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            productivityScore: { type: Type.INTEGER },
            bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedRoutineTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              }
            }
          },
          required: ["summary", "productivityScore", "bottlenecks", "suggestedRoutineTasks"]
        }
      }
    });

    const text = response.text; // Use .text property
    return JSON.parse(text || '{}') as TeamInsight;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    throw error;
  }
};

/**
 * Analyzes a specific manual task and suggests automation steps or smart workflows.
 */
export const analyzeTaskWithGemini = async (
  title: string,
  description: string,
  frequency: string,
  attachment?: { base64: string; mimeType: string }
): Promise<TaskAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const textPart = {
    text: `حلل المهمة اليدوية التالية واقترح خطة تقنية لأتمتتها أو تحويلها لعملية ذكية:
    اسم المهمة: ${title}
    الوصف الحالي: ${description}
    تكرار المهمة: ${frequency}
    
    المطلوب:
    1. ملخص (summary) لرؤية الأتمتة المقترحة.
    2. قائمة بالخطوات (steps) تتضمن (عنوان الخطوة، الوصف التقني، الأداة المقترحة، ومقتطف برمجي أو قالب إن أمكن).
    
    اجعل الرد باللغة العربية وفي صيغة JSON.`
  };

  const parts: any[] = [textPart];
  if (attachment) {
    parts.push({
      inlineData: {
        data: attachment.base64,
        mimeType: attachment.mimeType
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tool: { type: Type.STRING },
                  codeSnippet: { type: Type.STRING }
                },
                required: ["title", "description"]
              }
            }
          },
          required: ["summary", "steps"]
        }
      }
    });

    const text = response.text; // Use .text property
    return JSON.parse(text || '{}') as TaskAnalysis;
  } catch (error) {
    console.error("Gemini Automation Analysis Error:", error);
    throw error;
  }
};
