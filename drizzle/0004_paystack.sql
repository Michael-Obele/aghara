ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "lemon_customer_id";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "lemon_subscription_id";
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "paystack_customer_code" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "paystack_subscription_code" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "paystack_email_token" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'paystack' NOT NULL;
