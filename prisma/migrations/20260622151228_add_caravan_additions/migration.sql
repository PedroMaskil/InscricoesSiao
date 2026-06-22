-- CreateTable
CREATE TABLE "caravan_additions" (
    "id" TEXT NOT NULL,
    "caravan_id" TEXT NOT NULL,
    "people_count" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invoice_slug" TEXT,
    "list_file_url" TEXT,
    "list_file_name" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caravan_additions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "caravan_additions_caravan_id_idx" ON "caravan_additions"("caravan_id");

-- AddForeignKey
ALTER TABLE "caravan_additions" ADD CONSTRAINT "caravan_additions_caravan_id_fkey" FOREIGN KEY ("caravan_id") REFERENCES "caravans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
