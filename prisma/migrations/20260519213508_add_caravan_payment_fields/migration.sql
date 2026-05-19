-- AlterTable
ALTER TABLE "caravans" ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invoice_slug" TEXT,
ADD COLUMN     "leader_email" TEXT,
ADD COLUMN     "paid_at" TIMESTAMP(3);
