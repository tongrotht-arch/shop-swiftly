import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).single();
      if (shop) {
        setShopId(shop.id);
        const { data } = await supabase.from("products").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });
        setProducts(data ?? []);
      }
    };
    fetch();
  }, [user]);

  const resetForm = () => {
    setName(""); setPrice(""); setDescription(""); setImageFile(null); setEditProduct(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (p: Product) => {
    setEditProduct(p); setName(p.name); setPrice(String(p.price)); setDescription(p.description ?? ""); setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !user) return;
    setLoading(true);

    try {
      let imageUrl = editProduct?.image_url ?? null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/product-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("shop-images").upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("shop-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      if (editProduct) {
        const { error } = await supabase.from("products").update({ name, price: parseFloat(price), description, image_url: imageUrl }).eq("id", editProduct.id);
        if (error) throw error;
        setProducts((prev) => prev.map((p) => (p.id === editProduct.id ? { ...p, name, price: parseFloat(price), description, image_url: imageUrl } : p)));
        toast({ title: "Product updated!" });
      } else {
        const { data, error } = await supabase.from("products").insert({ shop_id: shopId, name, price: parseFloat(price), description, image_url: imageUrl }).select().single();
        if (error) throw error;
        setProducts((prev) => [data, ...prev]);
        toast({ title: "Product added!" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Product deleted" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Products</h1>
        </div>
      </header>

      <main className="container mx-auto space-y-4 p-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Photo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : editProduct ? "Update" : "Add Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {products.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">No products yet. Add your first product!</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id}>
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="h-48 w-full rounded-t-lg object-cover" />
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-lg font-bold text-primary">${Number(product.price).toFixed(2)}</p>
                  {product.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.description}</p>}
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(product)}>
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
