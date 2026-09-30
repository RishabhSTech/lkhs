-- CreateTable
CREATE TABLE "AnthropicIntegration" (
    "id" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "status" "ChannelConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "error" TEXT,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnthropicIntegration_pkey" PRIMARY KEY ("id")
);
