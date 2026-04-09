import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const plainText = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim().slice(0, 500)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `あなたはエントリから面白いキーワードの連想を生成するAIです。

JSONのみで返答してください:
{
  "columns": [
    {
      "keyword": "エントリから抽出したキーワード1（5文字以内）",
      "related1": "keyword1から連想される関連概念（抽象・上位・カテゴリなど）（8文字以内）",
      "related2": "keyword1を別角度からずらした概念（具体例・対比・派生など）（8文字以内）"
    },
    {
      "keyword": "エントリから抽出したキーワード2（5文字以内）",
      "related1": "keyword2の関連概念（8文字以内）",
      "related2": "keyword2のずらした概念（8文字以内）"
    },
    {
      "keyword": "エントリから抽出したキーワード3（5文字以内）",
      "related1": "keyword3の関連概念（8文字以内）",
      "related2": "keyword3のずらした概念（8文字以内）"
    }
  ]
}

## キーワード選定の原則
- エントリの中心にある具体的な名詞・動詞を選ぶ
- 3つが互いに異なる領域をカバーするように選ぶ

## related1・related2の原則
- related1: keyword の上位概念・カテゴリ・抽象化・本質に近いもの
- related2: keyword を横にずらしたもの。対比・別の具体例・意外な関連
- 単純な類義語にしない。読んだ人が「なるほど」と思う意外性を持たせる`,
    messages: [{ role: 'user', content: `以下のエントリからキーワードマトリクスを生成:\n\n${plainText}` }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const matrix = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')
  return NextResponse.json(matrix)
}
