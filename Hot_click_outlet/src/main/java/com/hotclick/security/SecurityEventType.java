package com.hotclick.security;

public enum SecurityEventType {
    // ── Autenticación ──────────────────────────────────────────────────────────
    LOGIN_SUCCESS,
    LOGIN_FAILED,
    LOGIN_BLOCKED,
    LOGOUT,
    // ── Contraseña ────────────────────────────────────────────────────────────
    PASSWORD_RESET_REQUEST,
    PASSWORD_RESET_SUCCESS,
    PASSWORD_CHANGED,
    // ── 2FA ───────────────────────────────────────────────────────────────────
    TWO_FA_SETUP,
    TWO_FA_ENABLED,
    TWO_FA_DISABLED,
    TWO_FA_FAILED,
    OTP_SENT,
    OTP_RESEND,
    OTP_EXPIRED,
    OTP_VERIFIED,
    // ── Tokens ────────────────────────────────────────────────────────────────
    TOKEN_REJECTED,
    TOKEN_EXPIRED,
    TOKEN_REFRESH,
    // ── Control de acceso ─────────────────────────────────────────────────────
    PERMISSION_DENIED,
    ACCESS_CONTROL_BLOCKED,
    // ── Acciones admin ────────────────────────────────────────────────────────
    ADMIN_ACTION,
    ROLE_CHANGE,
    // ── Rate limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_TRIGGERED,
    // ── Uploads ───────────────────────────────────────────────────────────────
    UPLOAD_REJECTED,
    // ── Detección de ataques ──────────────────────────────────────────────────
    SUSPICIOUS_ACTIVITY,
    BRUTE_FORCE_DETECTED,
    OTP_ABUSE_DETECTED,
    JWT_SCANNING_DETECTED,
    CREDENTIAL_STUFFING_DETECTED,
    // ── Registro ─────────────────────────────────────────────────────────────
    REGISTRATION_SUCCESS,
    REGISTRATION_FAILED
}
