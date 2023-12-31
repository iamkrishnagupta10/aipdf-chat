"use client";
import React from "react";
import { Input } from "./ui/input";
import { useChat } from "ai/react";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import MessageList from "./MessageList";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Message } from "ai";

type Props = { chatId: number };

const ChatComponent = ({ chatId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await axios.post<Message[]>("/api/get-messages", {
        chatId,
      });
      return response.data;
    },
  });

  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: "/api/chat",
    body: {
      chatId,
    },
    initialMessages: data || [],
  });
  React.useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    if (messageContainer) {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);
  return (
    <div className="relative flex flex-col h-screen border border-black">
      {/* Chat Header */}
      <header className="p-4 bg-slate-200 border-b border-black">
        <h3 className="text-xl font-bold">Chat History</h3>
      </header>

      {/* List of Messages */}
      <section className="flex flex-col-reverse flex-grow overflow-y-auto p-4">
        <MessageList messages={messages} isLoading ={isLoading}/>
      </section>

      {/* Chat Input Form */}
      <footer className="p-2 bg-slate-200 border-t border-black">
        <form onSubmit={handleSubmit} className="flex">
          {/* Chat Input Field */}
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask any question..."
            className="flex-grow mr-2"
          />
          {/* Send Button */}
          <Button>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
};

export default ChatComponent;

//   return (
//     <div
//       className="relative max-h-screen overflow-scroll"
//       id="message-container"
//     >
//       {/* header */}
//       <div className="sticky top-0 inset-x-0 p-2 bg-white h-fit">
//         <h3 className="text-xl font-bold">Chat</h3>
//       </div>

//       {/* message list */}
//       <MessageList messages={messages}/>

//       <form
//         onSubmit={handleSubmit}
//         className="sticky bottom-0 inset-x-0 px-2 py-4 bg-white"
//       >
//         <div className="flex">
//           <Input
//             value={input}
//             onChange={handleInputChange}
//             placeholder="Ask any question..."
//             className="w-full"
//           />
//           <Button className="bg-black">
//             <Send className="h-4 w-4" />
//           </Button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default ChatComponent;