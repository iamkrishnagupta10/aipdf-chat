import { Button } from "@/components/ui/button";
import { UserButton, auth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { checkSubscription } from "@/lib/subscription";
import SubscriptionButton from "@/components/SubscriptionButton";
import { chats } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export default async function Home() {
  const { userId } = await auth();
  const isAuth = !!userId;
  const isPro = await checkSubscription()
  let firstChat;
  if (userId) {
    firstChat = await db.select().from(chats).where(eq(chats.userId, userId));
    if (firstChat) {
      firstChat = firstChat[0];
    }
  }
  return (
    <div className="w-screen min-h-screen">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-5xl font-semibold">
            📄💬 ChatMagic 🚀🔮
          </h1>
          <h2 className="mt-2 text-3xl font-medium">
            Transform Your PDFs into Conversations!
          </h2>
          
          <div className="flex items-center mt-4 space-x-4">
            {isAuth && firstChat && (
            <Link href={`/chat/${firstChat.id}`}>
              <Button>
                Go to Chats <ArrowRight className="ml-2" />
              </Button>
            </Link>
            )}
            <div className="ml-3">
              <SubscriptionButton isPro={isPro} />
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>

          <p className="max-w-xl mt-1 text-lg text-slate-600 mt-4">
            Dive into documents effortlessly. 
            Our advanced AI assistant deciphers and chats about your PDF content, making research and understanding a breeze. 
            🚀📄🤖
          </p>
          
          <div className="w-full mt-4">
            {isAuth ? (
              <FileUpload/>
            ) : (
              <Link href="/sign-in">
                <Button>
                  Login to get Started!
                  <LogIn className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}