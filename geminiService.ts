
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordDefinition } from "./types";

const API_KEY = process.env.API_KEY || '';

export const getWordInfo = async (word: string): Promise<WordDefinition> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Look up the English word "${word}" for Korean students. Provide multiple meanings if available. 
    For EACH meaning, provide:
    1. 2-3 clear example sentences that specifically demonstrate that particular meaning.
    2. A list of 3-5 synonyms (유의어) specific to this meaning.
    3. A list of 3-5 antonyms (반의어) specific to this meaning.
    Ensure the output follows the requested JSON structure exactly.`,
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
                pos: { type: Type.STRING, description: "Part of speech, e.g., noun, verb" },
                definition: { type: Type.STRING, description: "English definition" },
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
            items: { type: Type.STRING },
            description: "General synonyms for the word as a whole"
          }
        },
        required: ["word", "phonetic", "partsOfSpeech", "meanings", "synonyms"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const getPronunciationAudio = async (word: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
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
  if (!base64Audio) throw new Error("Audio generation failed");
  return base64Audio;
};

// Audio Utilities as per guidelines
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
