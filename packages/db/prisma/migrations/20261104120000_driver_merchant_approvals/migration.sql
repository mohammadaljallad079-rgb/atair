-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('admin', 'website', 'app');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "license_expiry" TIMESTAMP(3),
ADD COLUMN     "license_number" TEXT,
ADD COLUMN     "national_id_expiry" TIMESTAMP(3),
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_user_id" UUID,
ADD COLUMN     "source" "RegistrationSource" NOT NULL DEFAULT 'admin';

-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "address" TEXT,
ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "commercial_reg" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "owner_name" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_user_id" UUID,
ADD COLUMN     "source" "RegistrationSource" NOT NULL DEFAULT 'admin',
ADD COLUMN     "vat_number" TEXT;

-- CreateTable
CREATE TABLE "merchant_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_key" TEXT,
    "number" TEXT,
    "expires_at" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_documents_tenant_id_merchant_id_idx" ON "merchant_documents"("tenant_id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_username_key" ON "users"("tenant_id", "username");

-- CreateIndex
CREATE INDEX "drivers_tenant_id_approval_status_idx" ON "drivers"("tenant_id", "approval_status");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE INDEX "merchants_tenant_id_approval_status_idx" ON "merchants"("tenant_id", "approval_status");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_documents" ADD CONSTRAINT "merchant_documents_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

