import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Store } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Shop = Tables<"shops">;
type Product = Tables<"products">;

interface CartItem {
  product: Product;
  quantity: number;
}

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: shopData } = await supabase.from("shops").select("*").eq("slug", slug).single();
      if (!shopData) { setLoading(false); return; }
      setShop(shopData);
      const { data: prodData } = await supabase.from("products").select("*").eq("shop_id", shopData.id).eq("is_available", true).order("created_at", { ascending: false });
      setProducts(prodData ?? []);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = cart.reduce((s, i) => s + i.quantity * Number(i.product.price), 0);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!shop) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Shop not found</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Shop Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto p-4">
          <div className="flex items-center gap-4">
            {shop.image_url ? (
              <img src={shop.image_url} alt={shop.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{shop.name}</h1>
              {shop.description && <p className="text-muted-foreground">{shop.description}</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {products.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">No products available yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="h-48 w-full object-cover" />
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  <p className="text-lg font-bold text-primary">${Number(product.price).toFixed(2)}</p>
                  {product.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.description}</p>}
                  <Button className="mt-3 w-full" onClick={() => addToCart(product)}>
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span className="font-semibold">{totalItems} items</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-bold">${totalAmount.toFixed(2)}</span>
            </div>
            <Button onClick={() => navigate(`/shop/${slug}/checkout`, { state: { cart, shop } })}>
              Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
