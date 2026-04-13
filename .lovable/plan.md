
## E-Commerce Platform with Telegram Bot Integration

### Overview
A web-based e-commerce platform where sellers create shops and list products, customers browse and order via unique shop links, and a Telegram bot handles notifications and order updates. Cash on delivery (COD) only. No platform commission.

### Phase 1: Database & Auth Setup
- Enable Lovable Cloud (Supabase) with email/password authentication
- Create database tables:
  - **profiles** — user type (seller/customer), name, phone, avatar
  - **shops** — shop name, description, photo, owner (seller), unique slug
  - **products** — name, price, description, photo, shop reference
  - **orders** — customer, shop, delivery address, phone, status (pending → confirmed → delivered), timestamps
  - **order_items** — order reference, product, quantity
- Set up RLS policies for all tables
- Storage bucket for product and shop images

### Phase 2: Seller Dashboard (Web)
- **Registration flow**: Sign up → choose "Seller" role → enter shop name, description, upload photo
- **Product management**: Add/edit/delete products with name, price, photo, description
- **Shop link**: Display unique shareable shop link (web URL + Telegram bot deep link)
- **Order management**: View incoming orders with customer details, confirm/update order status
- **Real-time notifications**: Supabase Realtime to show new orders instantly

### Phase 3: Customer Storefront (Web)
- **Shop page** (`/shop/:slug`): Public page showing seller's shop info and product grid
- **Product detail**: View product photo, description, price
- **Order flow**: Select products → enter delivery address & phone → place order (no account required, or simple signup)
- **Order confirmation**: Summary page with "Pay cash on delivery" notice
- **Order tracking**: Simple status page showing order progress

### Phase 4: Telegram Bot Integration
- Connect Telegram connector via Lovable connectors
- **Edge function** for sending messages (order notifications to sellers, confirmations to customers)
- **Polling edge function** with pg_cron for receiving bot messages
- **Bot commands**:
  - `/start` — greeting with Seller/Customer choice
  - Deep link handling (`?start=shopSlug`) — opens shop in Telegram Mini App or redirects to web
  - Order notifications to sellers when new orders arrive
  - Order confirmation messages to customers

### Design & UX
- Clean, mobile-first design (most users will access via phone from Telegram links)
- Simple card-based product grid
- Minimal checkout flow (address + phone, no payment processing needed for COD)
- Status badges for order tracking (Pending → Confirmed → Out for Delivery → Delivered)

### Out of Scope (for now)
- Delivery rider management (Phase 2 feature)
- Payment processing (COD only)
- Platform commission system
- Reviews/ratings
