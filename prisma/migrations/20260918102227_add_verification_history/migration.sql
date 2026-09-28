-- AlterTable
ALTER TABLE "Logbook" ADD COLUMN     "verificationHistory" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "OutputReport" ADD COLUMN     "verificationHistory" JSONB DEFAULT '[]';
