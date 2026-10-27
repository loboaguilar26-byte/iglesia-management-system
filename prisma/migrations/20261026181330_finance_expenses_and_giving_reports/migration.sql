-- CreateEnum
CREATE TYPE "GivingReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('VALID', 'VOIDED');

-- CreateTable
CREATE TABLE "giving_report" (
    "id" TEXT NOT NULL,
    "receivedAt" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "conceptId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "GivingReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "donationId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "giving_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "spentAt" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'VALID',
    "voidedAt" TIMESTAMPTZ(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "giving_report_donationId_key" ON "giving_report"("donationId");

-- CreateIndex
CREATE INDEX "giving_report_status_receivedAt_idx" ON "giving_report"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "giving_report_submittedById_createdAt_idx" ON "giving_report"("submittedById", "createdAt");

-- CreateIndex
CREATE INDEX "expense_spentAt_idx" ON "expense"("spentAt");

-- CreateIndex
CREATE INDEX "expense_status_spentAt_idx" ON "expense"("status", "spentAt");

-- AddForeignKey
ALTER TABLE "giving_report" ADD CONSTRAINT "giving_report_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "donation_concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_report" ADD CONSTRAINT "giving_report_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_report" ADD CONSTRAINT "giving_report_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_report" ADD CONSTRAINT "giving_report_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_report" ADD CONSTRAINT "giving_report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_report" ADD CONSTRAINT "giving_report_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
