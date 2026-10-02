-- CreateTable
CREATE TABLE "public"."AIReview" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIReview_submissionId_key" ON "public"."AIReview"("submissionId");

-- AddForeignKey
ALTER TABLE "public"."AIReview" ADD CONSTRAINT "AIReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
