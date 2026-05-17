-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "is_other_member" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "other_church" TEXT;
