import { PlutchikEmotion } from './types'
import {
  STOIC_SYSTEM_PROMPT,
  CBT_SYSTEM_PROMPT,
  PSYCHOLOGIST_SYSTEM_PROMPT,
  CHALLENGER_SYSTEM_PROMPT,
} from './prompts/personas'

export type PersonaId = 'stoic' | 'cbt' | 'psychologist' | 'challenger'

export interface Persona {
  id: PersonaId
  name: string
  role: string
  description: string
  color: string
  bg: string
  emoji: string
  systemPrompt: string
}

export interface MentorMessage {
  icon: string
  personaName: string
  message: string
  personaId: PersonaId
}

export function getMentorMessage(dominant: PlutchikEmotion): MentorMessage {
  switch (dominant) {
    case 'anger':
      return {
        icon: '🏛️',
        personaName: 'ストア哲学者',
        message: '怒りはコントロール外への反応です。今あなたがコントロールできることは何ですか？',
        personaId: 'stoic',
      }
    case 'fear':
    case 'sadness':
      return {
        icon: '💙',
        personaName: '心理士',
        message: 'その感情、しっかり受け取りました。もう少し一緒に掘り下げてみましょうか。',
        personaId: 'psychologist',
      }
    case 'disgust':
      return {
        icon: '🧠',
        personaName: 'CBTコーチ',
        message: 'その反応の裏にある思い込みを、一緒に確認してみませんか？',
        personaId: 'cbt',
      }
    case 'joy':
    case 'anticipation':
    case 'trust':
      return {
        icon: '⚡',
        personaName: 'チャレンジャー',
        message: '良い状態ですね。このエネルギー、次の一手に使いましょう。何に挑みますか？',
        personaId: 'challenger',
      }
    default:
      return {
        icon: '🏛️',
        personaName: 'ストア哲学者',
        message: '予期せぬことほど、自分を知るヒントになります。',
        personaId: 'stoic',
      }
  }
}

export const personas: Persona[] = [
  {
    id: 'stoic',
    name: 'ストア哲学者',
    role: 'マルクス・アウレリウス的視点',
    description: '感情に流されず、自分がコントロールできることに集中する思考を促します。',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.12)',
    emoji: '🏛️',
    systemPrompt: STOIC_SYSTEM_PROMPT,
  },
  {
    id: 'cbt',
    name: 'CBTコーチ',
    role: '認知行動療法ベース',
    description: '思考の歪みを優しく指摘し、より現実的・建設的な見方に書き換えるサポートをします。',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
    emoji: '🧠',
    systemPrompt: CBT_SYSTEM_PROMPT,
  },
  {
    id: 'psychologist',
    name: '心理士',
    role: '共感・深掘りアプローチ',
    description: '感情に寄り添いながら、深層にある感情やニーズを一緒に探ります。',
    color: '#38BDF8',
    bg: 'rgba(56,189,248,0.12)',
    emoji: '💙',
    systemPrompt: PSYCHOLOGIST_SYSTEM_PROMPT,
  },
  {
    id: 'challenger',
    name: 'チャレンジャー',
    role: '批判的思考・挑戦',
    description: '思い込みや言い訳に正面から向き合い、行動へのコミットメントを引き出します。',
    color: '#FB923C',
    bg: 'rgba(251,146,60,0.12)',
    emoji: '⚡',
    systemPrompt: CHALLENGER_SYSTEM_PROMPT,
  },
]
