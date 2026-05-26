/*
  Warnings:

  - You are about to drop the column `contactName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTerms` on the `Client` table. All the data in the column will be lost.
  - The `linkedInvoiceId` column on the `Quote` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "contactName",
DROP COLUMN "notes",
DROP COLUMN "paymentTerms";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "linkedInvoiceId",
ADD COLUMN     "linkedInvoiceId" BIGINT;
