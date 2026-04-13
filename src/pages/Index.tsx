import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Store, ShoppingBag, ArrowRight } from "lucide-react";

const Index = () => {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  // Redirect logged-in sellers to dashboard
  if (user && roles.includes("seller")) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-foreground">🛒 ShopBot</h1>
          <div className="flex gap-2">
            {user ? (
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>Sign In</Button>
                <Button onClick={() => navigate("/auth")}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
          Sell Online, <span className="text-primary">Effortlessly</span>
        </h2>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Create your shop, list products, and share your link on social media.
          Customers order and pay cash on delivery. No commissions.
        </p>

        <div className="mt-8 flex gap-4">
          <Button size="lg" onClick={() => navigate("/auth")}>
            <Store className="mr-2 h-5 w-5" /> Start Selling
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            <ShoppingBag className="mr-2 h-5 w-5" /> Start Shopping
          </Button>
        </div>

        {/* Features */}
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
            <h3 className="font-semibold text-foreground">Share Your Link</h3>
            <p className="text-sm text-muted-foreground">Share on Facebook, WhatsApp, TikTok or via Telegram bot.</p>
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
