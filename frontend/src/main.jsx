import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";

import App from "./App.jsx";

const LandingPage = lazy(() => import("./pages/LandingPage.jsx").then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx").then(m => ({ default: m.LoginPage })));
const OverviewPage = lazy(() => import("./pages/OverviewPage.jsx").then(m => ({ default: m.OverviewPage })));
const PrediksiPage = lazy(() => import("./pages/PrediksiPage.jsx").then(m => ({ default: m.PrediksiPage })));
const RiwayatPage = lazy(() => import("./pages/RiwayatPage.jsx").then(m => ({ default: m.RiwayatPage })));
const KonsultasiPage = lazy(() => import("./pages/KonsultasiPage.jsx").then(m => ({ default: m.KonsultasiPage })));
const PengaturanPage = lazy(() => import("./pages/PengaturanPage.jsx").then(m => ({ default: m.PengaturanPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx").then(m => ({ default: m.RegisterPage })));

const LoadingFallback = () => (
  <div className="page-loader">
    <span>Memuat halaman...</span>
  </div>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: "/register",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <RegisterPage />
      </Suspense>
    ),
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
