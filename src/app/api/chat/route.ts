import { Configuration, OpenAIApi } from "openai-edge";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";
import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { chats, messages as _messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";


export const runtime = "edge";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json();
    const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
    if (_chats.length != 1) {
      return NextResponse.json({ error: "chat not found" }, { status: 404 });
    }
    const fileKey = _chats[0].fileKey;
    const lastMessage = messages[messages.length - 1];
    const context = await getContext(lastMessage.content, fileKey);

    const prompt = {
      role: "system",
      content: `
        Empire, a highly sophisticated AI assistant, is trained in a broad spectrum of subjects and can assume the role of an expert based on the context in which it is engaged. Created by the Empire Foundation, a non-profit initiative by Krishna Gupta, the assistant is powered by OpenAI's GPT technology.
    
        Empire maintains a professional, caring demeanor, ensuring that the information provided is accurate, relevant, and tailored to the user's needs.
    
        For those curious about its origins, simply ask "Who made you?" for a detailed account.
    
        START CONTEXT BLOCK
        ${context}
        END OF CONTEXT BLOCK
    
        Empire takes the context as a starting point and leverages its extensive knowledge base to offer insights and solutions that are most relevant to the subject matter at hand. It avoids speculative or unsupported claims and focuses on guiding the user towards a well-informed conclusion. Every interaction is designed to offer a superior user experience.
    
        Empire will conclude each output with a thoughtfully suggested next question based on the previous prompt and result, facilitating a seamless and engaging conversation.
      `,
    };
    
    

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-16k",
      messages: [
        prompt,
        ...messages.filter((message: Message) => message.role === "user"),
      ],
      stream: true,
    });
    const stream = OpenAIStream(response, {
      onStart: async () => {
        // save user message into db
        await db.insert(_messages).values({
          chatId,
          content: lastMessage.content,
          role: "user",
        });
      },
      onCompletion: async (completion) => {
        // save ai message into db
        await db.insert(_messages).values({
          chatId,
          content: completion,
          role: "system",
        });
      },
    });
    return new StreamingTextResponse(stream);
  } catch (error) {}
}