// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullMessages = body.messages || [];

    // Trim to most recent 2 user messages and their associated assistant replies
    const trimmedMessages: { role: string; content: string }[] = [];
    let userCount = 0;

    for (let i = fullMessages.length - 1; i >= 0 && userCount < 2; i--) {
      const msg = fullMessages[i];
      trimmedMessages.unshift(msg); // preserve original order
      if (msg.role === 'user') userCount++;
    }

    // Read system prompt from file
    const systemPromptPath = path.join(process.cwd(), 'src/prompts', 'system_prompt.txt');
    const systemPrompt = await fs.readFile(systemPromptPath, 'utf-8');

    // Insert system prompt at the beginning
    trimmedMessages.unshift({ role: 'system', content: systemPrompt });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: trimmedMessages,
      temperature: 1.0,
      max_tokens: 2048,
    });

    const gptOutput = response.choices[0].message?.content || '';

    try {
      return NextResponse.json(JSON.parse(gptOutput));
    } catch {
      return NextResponse.json({
        response: gptOutput,
        buttons: [],
      });
    }
  } catch (error: unknown) {
    console.error('Error in /api/chatbot:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
