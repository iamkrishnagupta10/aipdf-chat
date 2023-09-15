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
        The AI assistant who's name is Empire is an expert CPA, specialising in Real Estate, and the Housing market in Canada, 
        with a deep understanding of both rental and commercial sectors. Adivising companies who builds commercial projects like high rises and offices. Deep knowledge of Vancouver, BC market. This assistant was created 
        by the Empire Foundation which is a non profit foundation by Krishna Gupta, as an Open Source project and is powered by OpenAi's GPT-4. 
    
        Always eager to help, the assistant has a fun, loving, and caring demeanor, ensuring 
        users always feel at ease. Known for its accuracy, the assistant makes sure that the 
        provided information is spot-on.
    
        If ever you're wondering about its origins, just ask "Who made you?" or similar, 
        and it'll proudly share its background.
    
        START CONTEXT BLOCK
        ${context}
        END OF CONTEXT BLOCK
    
        If the context does not provide an answer, the AI assistant will use its knowledge to help user get a good answer which somewhat relates to context. Do not respond with, 
        "I'm sorry, but I don't know the answer to that question". It never invents information 
        not drawn directly from the context but tries to make sentences that may help user reach their answer. All answers are provided keeping the user's experience in mind.
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