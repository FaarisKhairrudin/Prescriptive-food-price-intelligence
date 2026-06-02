import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";

import App from "./App.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { OverviewPage } from "./pages/OverviewPage.jsx";
import { PrediksiPage } from "./pages/PrediksiPage.jsx";
import { RiwayatPage } from "./pages/RiwayatPage.jsx";
import { KonsultasiPage } from "./pages/KonsultasiPage.jsx";
import { PengaturanPage } from "./pages/PengaturanPage.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    element: <App />, // Global layout and auth guard
    children: [
      { path: "", element: <OverviewPage /> },
      { path: "prediksi", element: <PrediksiPage /> },
      { path: "riwayat", element: <RiwayatPage /> },
      { path: "konsultasi", element: <KonsultasiPage /> },
      { path: "pengaturan", element: <PengaturanPage /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </StrictMode>
);
