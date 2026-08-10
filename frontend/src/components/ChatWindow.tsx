import { use, useState } from "react";

interface Message{
    role: "user" | "ai";
    content: string;
}

function ChatWindow() {
    const [query, setQuery] = useState("")  ;    
    const[messages, setMassages] = useState<Message[]>([]);
    
    const handleSubmit = () => {
        if(!query.trim()){
            return;
        }

        const newMassage: Message = {
            role: "user",
            content: query,
        };

        setMassages((previousMessages)=> [
            ...previousMessages ,
            newMassage,
        ]);

        setQuery("");
    };

    return (
    <main className="flex flex-1 flex-col">

        {/* // Header of the Chat */}
        <header className="border-b border-gray-800 px-6 py-4">
            <h1 className="text-lg font-semibold">
                AI SQL Assistant
            </h1>
        
            <p className="text-sm text-gray-500">
                Ask questions about your database using natural language.
            </p>

        </header>

        {/* // Chat Area Middle Section */}
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            {messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                    <div className="text-centre">

                        <div className="mb-4 text-4xl">
                            👋
                        </div>

                        <h2 className="text-2xl font-semibold">
                            Ask your database anything
                        </h2>

                        <p className="mt-2 text-gray-500">
                            Try asking: "Show me the top 5 employees by salary"
                        </p>
                        
                    </div>
                </div>
        ): (
            <div className="mx-auto w-full max-w-3xl">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xl rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-white text-gray-900"
                      : "bg-gray-800 text-gray-100"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
        

        {/* // Input Area */}
        <div className="border-t border-gray-900 p-4">
            <div className="mx-auto flex max-w-3xl items-centre rounded-xl border border-gray-700 bg-gray-900 px-4 py-2">
                <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            handleSubmit();
                        }
                    }}
                    placeholder="Ask a question about your data..."
                    className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-gray-600"
                />
                <button 
                    onClick={handleSubmit}
                    className="ml-3 rounded-lg bg-white px-4 py-2 text sm font-medium text-gray-900"
                >
                    ➤
                </button>
            </div>
        </div>

    </main>
  );
}

export default ChatWindow;