import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Borrow } from "./pages/Borrow";
import { Lend } from "./pages/Lend";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="borrow" element={<Borrow />} />
        <Route path="lend" element={<Lend />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
