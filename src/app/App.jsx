import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "../features/auth/auth-context.jsx";
import { router } from "./routes.jsx";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
