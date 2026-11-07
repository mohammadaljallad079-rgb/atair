-- Driver profile fields collected by the Admin "Add Driver" form and the
-- driver mobile profile screen. `zone_id` is a soft reference to service_zones
-- (no FK) so a zone can be removed without orphaning a driver.
ALTER TABLE "drivers" ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "address" TEXT,
ADD COLUMN     "zone_id" UUID,
ADD COLUMN     "employment_type" TEXT,
ADD COLUMN     "classification" TEXT;
