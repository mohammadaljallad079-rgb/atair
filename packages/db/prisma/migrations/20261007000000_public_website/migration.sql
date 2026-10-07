-- AlterTable
ALTER TABLE "orders" ADD COLUMN "tracking_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_tracking_code_key" ON "orders"("tracking_code");
