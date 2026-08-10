
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import './App.css'

function App() {

  return (

      <div className="flex min-h-screen bg-gray-950 text-white">

        <Sidebar />

        <ChatWindow />

      </div>
    
  );
}

export default App
