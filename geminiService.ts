
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordDefinition } from "./types";

export const getWordInfo = async (word: string): Promise<WordDefinition> => {
  // 호출 시점에 새 인스턴스를 생성하여 주입된 API_KEY를 확실히 사용함
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // 더 복잡한 구조 처리에 능숙한 프로 모델 사용
      contents: `Look up the English word "${word}" for Korean K-12 students. 
      Return the response as a pure JSON object without any markdown formatting.
      Include phonetic symbols, multiple meanings, examples, synonyms, and antonyms.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            partsOfSpeech: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            meanings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pos: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  koreanMeanings: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  examples: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sentence: { type: Type.STRING },
                        translation: { type: Type.STRING }
                      },
                      required: ["sentence", "translation"]
                    }
                  },
                  synonyms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  antonyms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["pos", "definition", "koreanMeanings", "examples", "synonyms", "antonyms"]
              }
            },
            synonyms: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["word", "phonetic", "partsOfSpeech", "meanings", "synonyms"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 응답이 비어있습니다.");

    // JSON만 추출하기 위한 정규식 처리 (마크다운 ```json 태그 등이 포함될 경우 대비)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : text;

    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error("Gemini 서비스 오류:", error);
    throw error;
  }
};

export const getPronunciationAudio = async (word: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Pronounce clearly: ${word}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("발음 생성에 실패했습니다.");
  return base64Audio;
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
