-- CreateEnum
CREATE TYPE "CodStatus" AS ENUM ('none', 'pending', 'collected', 'settled', 'cancelled');

-- DropIndex
DROP INDEX "customers_tenant_id_phone_key";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "merchant_id" UUID;

-- AlterTable
ALTER TABLE "merchant_users" ADD COLUMN     "branch_id" UUID;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cod_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cod_collected_at" TIMESTAMP(3),
ADD COLUMN     "cod_settled_at" TIMESTAMP(3),
ADD COLUMN     "cod_status" "CodStatus" NOT NULL DEFAULT 'none';

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "merchant_id" UUID;

-- CreateTable
CREATE TABLE "merchant_settlements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "reference" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "cod_collected" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "delivery_fees" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commission_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net_payable" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "SettlementStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchant_settlements_reference_key" ON "merchant_settlements"("reference");

-- CreateIndex
CREATE INDEX "merchant_settlements_tenant_id_merchant_id_status_idx" ON "merchant_settlements"("tenant_id", "merchant_id", "status");

-- CreateIndex
CREATE INDEX "customers_tenant_id_merchant_id_idx" ON "customers"("tenant_id", "merchant_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_phone_idx" ON "customers"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "merchant_users_user_id_idx" ON "merchant_users"("user_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_merchant_id_status_idx" ON "orders"("tenant_id", "merchant_id", "status");

-- CreateIndex
CREATE INDEX "support_tickets_tenant_id_merchant_id_idx" ON "support_tickets"("tenant_id", "merchant_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_users" ADD CONSTRAINT "merchant_users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "merchant_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_settlements" ADD CONSTRAINT "merchant_settlements_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
