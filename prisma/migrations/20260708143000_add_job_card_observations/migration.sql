-- AlterTable
ALTER TABLE "JobCard"
ADD COLUMN "finalQcBy" TEXT,
ADD COLUMN "estimatedTotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "advanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "balanceDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "paymentMode" "PaymentMode";

-- CreateTable
CREATE TABLE "JobCardServiceObservation" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "partService" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCardServiceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobCardServiceObservation_jobCardId_idx" ON "JobCardServiceObservation"("jobCardId");

-- AddForeignKey
ALTER TABLE "JobCardServiceObservation" ADD CONSTRAINT "JobCardServiceObservation_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
