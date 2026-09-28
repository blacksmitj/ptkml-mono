-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "loginFailedCount" INTEGER NOT NULL DEFAULT 0;
