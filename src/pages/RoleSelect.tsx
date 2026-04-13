import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RoleSelect() {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRole = async (role: "seller" | "customer") => {
    try {
      await setRole(role);
      navigate(role === "seller" ? "/dashboard" : "/");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">How will you use the platform?</h1>
          <p className="mt-2 text-muted-foreground">Choose your role to get started</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg" onClick={() => handleRole("seller")}>
            <CardHeader className="items-center text-center">
              <Store className="h-12 w-12 text-primary" />
              <CardTitle>I'm a Seller</CardTitle>
              <CardDescription>Create your shop and list products</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">Start Selling</Button>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-shadow hover:shadow-lg" onClick={() => handleRole("customer")}>
            <CardHeader className="items-center text-center">
              <ShoppingBag className="h-12 w-12 text-primary" />
              <CardTitle>I'm a Customer</CardTitle>
              <CardDescription>Browse shops and order products</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">Start Shopping</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
