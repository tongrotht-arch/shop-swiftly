import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTelegram } from "@/hooks/useTelegram";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

interface CartItem {
  product: Tables<"products">;
  quantity: number;
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { user } = useAuth();
  const { tgUser } = useTelegram();
  const { toast } = useToast();
  const { cart, shop } = (location.state as { cart: CartItem[]; shop: Tables<"shops"> }) ?? { cart: [], shop: null };

  // Pre-fill from Telegram user data
  const [customerName, setCustomerName] = useState(tgUser?.first_name ?? "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const totalAmount = cart.reduce((s: number, i: CartItem) => s + i.quantity * Number(i.product.price), 0);

  if (!cart.length || !shop) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No items in cart</p>
          <Button className="mt-4" onClick={() => navigate(`/shop/${slug}`)}>Back to Shop</Button>
        </div>
      </div>
    );
  }

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) throw new Error("Not authenticated. Please open this app inside Telegram.");

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          shop_id: shop.id,
          customer_name: customerName,
          delivery_address: address,
          phone,
          total_amount: totalAmount,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const items = cart.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.quantity,
        price_at_time: Number(i.product.price),
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      // Send notification to seller via Telegram
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(`https://${projectId}.supabase.co/functions/v1/order-notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: order.id }),
        });
      } catch {
        // Non-critical - don't fail the order
      }

      navigate(`/order/${order.id}`, { state: { order, items: cart } });
    } catch (error: any) {
      toast({ title: "Error placing order", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-2">
            {cart.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span>{item.product.name} × {item.quantity}</span>
                <span>${(item.quantity * Number(item.product.price)).toFixed(2)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
            <Badge variant="outline" className="w-full justify-center py-1 text-center">
              💵 Cash on Delivery
            </Badge>
          </div>

          <form onSubmit={handleOrder} className="space-y-4">
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Full delivery address" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+1234567890" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Placing Order..." : "Place Order"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
