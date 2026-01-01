
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordDefinition } from "./types";

export const getWordInfo = async (word: string): Promise<WordDefinition> => {
  // 항상 최신 API 키를 사용하도록 매 호출 시 인스턴스 생성
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // 사전 검색에 최적화된 빠르고 안정적인 모델
      contents: `Look up the English word "${word}" for Korean K-12 students. 
      The response must be a single valid JSON object containing: word, phonetic, partsOfSpeech, meanings (with pos, definition, koreanMeanings, examples with translation, synonyms, antonyms), and general synonyms.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            partsOfSpeech: { type: Type.ARRAY, items: { type: Type.STRING } },
            meanings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pos: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  koreanMeanings: { type: Type.ARRAY, items: { type: Type.STRING } },
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
                  synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  antonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["pos", "definition", "koreanMeanings", "examples", "synonyms", "antonyms"]
              }
            },
            synonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["word", "phonetic", "partsOfSpeech", "meanings", "synonyms"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 응답 데이터가 없습니다.");

    // 마크다운 태그 제거 로직 포함
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    if (error.message?.includes('fetch')) {
      throw new Error("인터넷 연결이 불안정합니다. 네트워크 상태를 확인하고 다시 시도해 주세요.");
    }
    console.error("Gemini Lookup Error:", error);
    throw error;
  }
};

export const getPronunciationAudio = async (word: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Pronounce: ${word}` }] }],
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
    if (!base64Audio) throw new Error("Audio failed");
    return base64Audio;
  } catch (e) {
    throw new Error("발음 서버 연결에 실패했습니다.");
  }
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
