import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTelegram } from "@/hooks/useTelegram";
import { Button } from "@/components/ui/button";
import { Store, ShoppingBag, ArrowRight } from "lucide-react";

const Index = () => {
  const { user, roles, loading } = useAuth();
  const { isTelegram } = useTelegram();
  const navigate = useNavigate();

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  // Redirect logged-in sellers to dashboard
  if (user && roles.includes("seller")) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-foreground">🛒 ShopBot</h1>
          <div className="flex gap-2">
            {user ? (
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
            ) : !isTelegram ? (
              <p className="text-sm text-muted-foreground">Open via Telegram to get started</p>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
          Sell Online, <span className="text-primary">Effortlessly</span>
        </h2>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Create your shop, list products, and share your link on Telegram.
          Customers order and pay cash on delivery. No commissions.
        </p>

        {isTelegram ? (
          <div className="mt-8 flex gap-4">
            <Button size="lg" onClick={() => navigate("/role-select")}>
              <Store className="mr-2 h-5 w-5" /> Start Selling
            </Button>
          </div>
        ) : (
          <p className="mt-8 text-muted-foreground">
            Open this app inside Telegram to start selling or shopping.
          </p>
        )}

        <div className="mt-16 grid w-full max-w-4xl gap-8 sm:grid-cols-3">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Create Your Shop</h3>
            <p className="text-sm text-muted-foreground">Set up in under 3 minutes with a name, description, and photo.</p>
          </div>
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ArrowRight className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Share on Telegram</h3>
            <p className="text-sm text-muted-foreground">Share your shop link via Telegram bot to customers.</p>
          </div>
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Cash on Delivery</h3>
            <p className="text-sm text-muted-foreground">Customers pay cash when their order arrives. Simple.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
