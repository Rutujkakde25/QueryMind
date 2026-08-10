import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import QueryPage from "./pages/QueryPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/query" element={<QueryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;