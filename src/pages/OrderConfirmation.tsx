import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

export default function OrderConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <CardTitle className="text-2xl">Order Placed!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Your order has been placed successfully.</p>
          <Badge variant="outline" className="text-lg px-4 py-2">💵 Pay Cash on Delivery</Badge>
          {order && (
            <div className="text-left space-y-1 text-sm">
              <p><strong>Order ID:</strong> {order.id.slice(0, 8)}...</p>
              <p><strong>Total:</strong> ${Number(order.total_amount).toFixed(2)}</p>
              <p><strong>Status:</strong> <Badge variant="secondary">{order.status}</Badge></p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            A delivery rider will bring your order to your address. Please have cash ready.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">Back to Home</Button>
        </CardContent>
      </Card>
    </div>
  );
}
