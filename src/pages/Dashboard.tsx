import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTelegram } from "@/hooks/useTelegram";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Store, Package, ClipboardList, LogOut, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Shop = Tables<"shops">;
type Order = Tables<"orders"> & { order_items: Tables<"order_items">[] };

export default function Dashboard() {
  const { user, roles, signOut, loading } = useAuth();
  const { isTelegram } = useTelegram();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      if (!isTelegram) navigate("/");
      return;
    }
    if (!loading && user && !roles.includes("seller")) navigate("/role-select");
  }, [user, roles, loading]);

  useEffect(() => {
    if (!user) return;
    const fetchShop = async () => {
      const { data } = await supabase.from("shops").select("*").eq("owner_id", user.id).single();
      if (data) {
        setShop(data);
        const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("shop_id", data.id);
        setProductCount(count ?? 0);
        const { data: orderData } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("shop_id", data.id)
          .order("created_at", { ascending: false });
        setOrders((orderData as Order[]) ?? []);
      }
    };
    fetchShop();

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        if (shop && payload.new.shop_id === shop.id) {
          toast({ title: "New Order!", description: `Order from ${payload.new.customer_name}` });
          setOrders((prev) => [payload.new as Order, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, shop?.id]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: status as any } : o)));
    toast({ title: "Order Updated", description: `Status changed to ${status}` });
  };

  const shopUrl = shop ? `${window.location.origin}/shop/${shop.slug}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shopUrl);
    toast({ title: "Link copied!" });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "secondary";
      case "confirmed": return "default";
      case "delivered": return "default";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  if (!shop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Store className="mx-auto h-12 w-12 text-primary" />
            <CardTitle>Create Your Shop</CardTitle>
            <CardDescription>Set up your shop to start selling</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/shop/create")} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Create Shop
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{shop.name}</h1>
            <p className="text-sm text-muted-foreground">Seller Dashboard</p>
          </div>
          {!isTelegram && (
            <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto space-y-6 p-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
            <code className="flex-1 truncate text-sm">{shopUrl}</code>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="mr-1 h-3 w-3" /> Copy
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/shop/${shop.slug}`}>View Shop</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{productCount}</p>
                <p className="text-sm text-muted-foreground">Products</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <ClipboardList className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-sm text-muted-foreground">Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <ClipboardList className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{orders.filter((o) => o.status === "pending").length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => navigate("/products")}>
            <Package className="mr-2 h-4 w-4" /> Manage Products
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders yet. Share your shop link to get started!</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                        <p className="text-sm text-muted-foreground">Phone: {order.phone}</p>
                        <p className="mt-1 text-sm font-medium">Total: ${Number(order.total_amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <Badge variant={statusColor(order.status)}>{order.status}</Badge>
                    </div>
                    {order.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, "confirmed")}>Confirm</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, "cancelled")}>Cancel</Button>
                      </div>
                    )}
                    {order.status === "confirmed" && (
                      <div className="mt-3">
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, "out_for_delivery")}>Mark Out for Delivery</Button>
                      </div>
                    )}
                    {order.status === "out_for_delivery" && (
                      <div className="mt-3">
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, "delivered")}>Mark Delivered</Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
