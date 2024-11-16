import { FormEvent, useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { Avatar, AvatarImage } from "./components/ui/avatar";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { ScrollArea } from "./components/ui/scroll-area";
import { client } from "./lib/openAiService";
import { Badge } from "./components/ui/badge";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [preference, setPreference] = useState<"movie" | "anime" | null>(null);

  // Add refs for scroll management
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAvatarSrc = (role: string) => {
    if (role === "user") {
      return "https://github.com/shadcn.png";
    }

    if (preference === "anime") {
      return "https://i.pinimg.com/736x/1f/9c/d0/1f9cd0cab30ee9cf58e19510bef3a55d.jpg";
    }

    if (preference === "movie") {
      return "https://i.pinimg.com/736x/de/6b/57/de6b57107eee677bc4cd46f67250d892.jpg";
    }

    return "https://github.com/shadcn.png";
  };

  const getDefaultPrompt = (type: "movie" | "anime") => {
    if (type === "anime") {
      return "Hi! I'm your anime expert assistant. Let me help you discover new anime series, understand complex plots, or discuss your favorite characters. Try asking me something like:\n\n'Can you recommend anime similar to Attack on Titan?' or 'Explain the plot of Steins;Gate'";
    } else {
      return "Hello! I'm your movie expert assistant. I can help you find new movies, explain plot details, or discuss cinema history. Try asking me something like:\n\n'What are some movies similar to Inception?' or 'Explain the ending of Interstellar'";
    }
  };

  const handlePreferenceSelect = async (type: "movie" | "anime") => {
    setPreference(type);
    const systemMessage: Message = {
      role: "system",
      content: `You are an AI assistant specialized in ${type}s. Provide detailed and engaging responses about ${type}s. and don't answer any out of context quesions and also treat movie and anime separate.`,
    };

    const assistantMessage: Message = {
      role: "assistant",
      content: getDefaultPrompt(type),
    };

    setMessages([systemMessage, assistantMessage]);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsStreaming(true);

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: prompt },
    ];
    setMessages(newMessages);
    setPrompt("");

    setMessages((messages) => [
      ...messages,
      { role: "assistant", content: "" },
    ]);

    try {
      const stream = await client.chat.completions.create({
        messages: newMessages,
        model: "gpt-4o-mini-2024-07-18",
        stream: true,
      });

      let streamedContent = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        streamedContent += content;

        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          newMessages[newMessages.length - 1].content = streamedContent;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setMessages((messages) => messages.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="bg-background text-foreground min-h-[100vh] p-4 grid place-items-center">
      <div className="w-full 2xl:w-[800px] space-y-4">
        <h1 className="text-2xl text-center font-bold">
          Ask <span className="text-green-500">anime.me</span> ⭐
        </h1>
        {preference && (
          <>
            <h1 className="text-xl">
              Current preference
              <span className="text-green-500 capitalize font-bold ml-2 underline">
                {preference}
              </span>
            </h1>
            <h3
              className="text-sm cursor-pointer"
              onClick={() => {
                setPreference(null);
                setMessages([]);
              }}
            >
              Click here to change preference
            </h3>
          </>
        )}
        {!preference && (
          <>
            <h1 className="text-xl text-center">What's your mode today 🤩 ?</h1>
            <div className="flex gap-2 mx-auto w-fit">
              <Badge
                variant={"outline"}
                className="cursor-pointer text-[16px]"
                onClick={() => handlePreferenceSelect("anime")}
              >
                Anime
              </Badge>
              <Badge
                variant={"outline"}
                className="cursor-pointer text-[16px]"
                onClick={() => handlePreferenceSelect("movie")}
              >
                Movie
              </Badge>
            </div>
          </>
        )}
        {preference && (
          <>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder={`Ask anything about ${preference}s`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isStreaming}
              />
              <Button type="submit" disabled={!prompt || isStreaming}>
                {isStreaming ? "Thinking..." : "Search"}
              </Button>
            </form>
            <ScrollArea className="h-[300px] rounded-md bg-muted p-4">
              <div ref={scrollAreaRef} className="h-full overflow-y-auto">
                {messages.length > 0 ? (
                  messages
                    .filter((msg) => msg.role !== "system")
                    .map((msg, index) => (
                      <div key={index} className="mb-2">
                        <div
                          className={`text-sm flex gap-2 ${
                            msg.role === "user"
                              ? "text-background bg-secondary-foreground font-semibold rounded-md w-fit ml-auto p-3"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Avatar className="w-7 h-7">
                            <AvatarImage
                              src={getAvatarSrc(msg.role)}
                              alt={msg.role}
                            />
                          </Avatar>
                          <Markdown className="mt-1">{msg.content}</Markdown>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No response yet...
                  </p>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
