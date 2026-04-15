import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { TelegramProvider, useTelegram } from "@/hooks/useTelegram";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ShopCreate from "./pages/ShopCreate";
import Products from "./pages/Products";
import ShopPage from "./pages/ShopPage";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import RoleSelect from "./pages/RoleSelect";

const queryClient = new QueryClient();

function TelegramRouter() {
  const { isTelegram, startParam, ready } = useTelegram();

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  // If inside Telegram with a start_param like "shop123", redirect to that shop
  if (isTelegram && startParam) {
    const param = startParam;
    if (param === "dashboard") {
      return (
        <Routes>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/shop/create" element={<ShopCreate />} />
          <Route path="/products" element={<Products />} />
          <Route path="/role-select" element={<RoleSelect />} />
          <Route path="/shop/:slug" element={<ShopPage />} />
          <Route path="/shop/:slug/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<OrderConfirmation />} />
        </Routes>
      );
    }
    // Treat start_param as shop slug
    return (
      <Routes>
        <Route path="/" element={<Navigate to={`/shop/${param}`} replace />} />
        <Route path="/shop/:slug" element={<ShopPage />} />
        <Route path="/shop/:slug/checkout" element={<Checkout />} />
        <Route path="/order/:id" element={<OrderConfirmation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/shop/create" element={<ShopCreate />} />
        <Route path="/products" element={<Products />} />
        <Route path="/role-select" element={<RoleSelect />} />
        <Route path="*" element={<Navigate to={`/shop/${param}`} replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/shop/create" element={<ShopCreate />} />
      <Route path="/products" element={<Products />} />
      <Route path="/shop/:slug" element={<ShopPage />} />
      <Route path="/shop/:slug/checkout" element={<Checkout />} />
      <Route path="/order/:id" element={<OrderConfirmation />} />
      <Route path="/role-select" element={<RoleSelect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TelegramProvider>
          <AuthProvider>
            <TelegramRouter />
          </AuthProvider>
        </TelegramProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
