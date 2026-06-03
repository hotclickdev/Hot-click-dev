-- Clerk OAuth integration: stores Clerk user ID for social login (Google, Apple, Microsoft, etc.)
ALTER TABLE hot_click_usuario_tb
    ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_clerk_id
    ON hot_click_usuario_tb(clerk_user_id)
    WHERE clerk_user_id IS NOT NULL;
