import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";
import { systemPrompt } from "@/lib/business";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: process.env.CHAT_MODEL ?? "anthropic/claude-sonnet-5.5",
    system: systemPrompt,
    messages: await convertToModelMessages(messages.slice(-20)),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
