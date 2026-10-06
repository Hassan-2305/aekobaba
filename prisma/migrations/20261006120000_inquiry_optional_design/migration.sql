-- Design status is optional on the public quote form (buyer review, Oct 2026):
-- an unanswered question is stored as NULL rather than a guessed answer.
ALTER TABLE "Inquiry" ALTER COLUMN "designStatus" DROP NOT NULL;
