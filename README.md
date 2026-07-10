# Meharban Car A/C Works

Digital Job Card & Service Management System for car A/C service, diagnosis, estimates, final service bills, payments, customer tracking, staff workload, reports, and WhatsApp-ready updates.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Custom hashed-password authentication
- Zod validation
- React Hook Form
- Lucide React icons
- Print-friendly Job Card, Estimate, and Service Bill pages

## Supabase Demo Setup

This project uses Supabase only as PostgreSQL hosting. It does not use Supabase Auth, Supabase Storage, or the Supabase client SDK.

1. Create a Supabase project.
2. Open the Supabase project dashboard.
3. Click `Connect`.
4. Copy the Supavisor Transaction pooler URL on port `6543`.
5. Set it as `DATABASE_URL`.
6. Copy the Supavisor Session pooler URL on port `5432`.
7. Set it as `DIRECT_URL`.
8. Keep `DATABASE_POOL_MAX="1"` for Vercel/serverless.

Example:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require"
DATABASE_POOL_MAX="1"
```

If your password has special characters, URL-encode the password before putting it in the connection string.

## Local Setup With Supabase

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env`.
3. Add your Supabase `DATABASE_URL` and `DIRECT_URL`.
4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
5. Apply the existing migration to Supabase:
   ```bash
   npx prisma migrate deploy
   ```
6. Seed demo data:
   ```bash
   npx prisma db seed
   ```
7. Start the app:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:migrate:dev`
- `npm run prisma:seed`

## Default Admin Login

- Email: `admin@meharbanacworks.com`
- Password: `admin12345`

The seed script hashes the password before storing it.

## Vercel Demo Deployment

1. Create a Supabase project.
2. Add `DATABASE_URL` in Vercel using Supavisor Transaction pooler port `6543`.
3. Add `DIRECT_URL` in Vercel using Supavisor Session pooler port `5432` or Direct connection.
4. Add `DATABASE_POOL_MAX="1"`.
5. Add `NEXTAUTH_SECRET`.
6. Add `NEXTAUTH_URL` with the Vercel domain.
7. Add `NEXT_PUBLIC_APP_URL` with the Vercel domain.
8. Add WhatsApp variables only when ready.
9. Run Prisma migrations against Supabase:
   ```bash
   npx prisma migrate deploy
   ```
10. Deploy the Next.js app on Vercel.

## Hostinger VPS Production Notes

When moving from Supabase demo to Hostinger VPS:

1. Install Node.js.
2. Install PostgreSQL on the VPS or connect to external managed PostgreSQL.
3. Clone the project.
4. Add `.env.production`.
5. Set `DATABASE_URL` to the VPS PostgreSQL URL.
6. Set `DIRECT_URL` to the same direct PostgreSQL URL unless you add a separate pooler.
7. Set `DATABASE_POOL_MAX` based on VPS capacity, for example `10`.
8. Run `npm install`.
9. Run `npx prisma generate`.
10. Run `npx prisma migrate deploy`.
11. Run `npm run build`.
12. Run the app using `npm run start` or PM2.
13. Configure Nginx reverse proxy if needed.
14. Add domain and SSL.
15. Configure WhatsApp webhook URL after the domain is live.

## WhatsApp API Setup

Set these values when Meta WhatsApp Cloud API sending is ready:

```env
WHATSAPP_API_URL="https://graph.facebook.com/v20.0"
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_VERIFY_TOKEN=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

If API credentials are missing or API sending is disabled in Settings, the app saves the message as pending and provides copy/open WhatsApp fallback actions.

Webhook route:

```text
/api/webhooks/whatsapp
```

## Document Flow

The app uses simple estimates and final service bills. Job cards are mandatory for vehicle service. Estimates are optional before work starts, and a final service bill is mandatory after completion.

## Main Modules

- Authentication
- Home
- Customer Details Inside Job Cards
- Vehicle Details Inside Job Cards
- Digital Job Card Management
- Service Status Tracking
- Estimation Management
- Final Service Bill Management
- Payment Tracking
- WhatsApp Notification System
- WhatsApp API Logs and Verification
- Public Customer Tracking Page
- Workshop History On Home Page
- Reports
- Settings
- Print Pages
