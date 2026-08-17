package com.hotclick.service.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Queue;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class SecurityRateWindowTracker {

    private static final Logger log = LoggerFactory.getLogger(SecurityRateWindowTracker.class);

    private static final long SPRAY_WINDOW_MS = 300_000L;
    private static final long STUFFING_WINDOW_MS = 3_600_000L;
    private static final long JWT_SCAN_WINDOW_MS = 300_000L;
    private static final long OTP_FLOOD_WINDOW_MS = 600_000L;
    private static final long ALERT_COOLDOWN_MS = 300_000L;

    private final ConcurrentHashMap<String, Queue<Long>> failedLoginsByIp = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Queue<Long>> invalidJwtsByIp = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Queue<Long>> otpRequestsByUser = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> sprayTargetsByIp = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> sprayWindowStartMs = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> alertCooldowns = new ConcurrentHashMap<>();

    public SecurityRateWindowTracker() {
        ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "sec-detection-cleaner");
            t.setDaemon(true);
            return t;
        });
        cleaner.scheduleAtFixedRate(this::cleanup, 15, 15, TimeUnit.MINUTES);
    }

    public Queue<Long> failedLoginsForIp(String ip) {
        return failedLoginsByIp.computeIfAbsent(ip, key -> new ConcurrentLinkedQueue<>());
    }

    public Queue<Long> invalidJwtsForIp(String ip) {
        return invalidJwtsByIp.computeIfAbsent(ip, key -> new ConcurrentLinkedQueue<>());
    }

    public Queue<Long> otpRequestsForUser(Long userId) {
        return otpRequestsByUser.computeIfAbsent(userId, key -> new ConcurrentLinkedQueue<>());
    }

    public Set<String> sprayTargetsForIp(String ip, long now, long windowMs) {
        Long windowStart = sprayWindowStartMs.get(ip);
        if (windowStart == null || now - windowStart > windowMs) {
            sprayWindowStartMs.put(ip, now);
            sprayTargetsByIp.put(ip, ConcurrentHashMap.newKeySet());
        }
        return sprayTargetsByIp.computeIfAbsent(ip, key -> ConcurrentHashMap.newKeySet());
    }

    public boolean isAlertCoolingDown(String cooldownKey, long now, long cooldownMs) {
        Long lastAlert = alertCooldowns.get(cooldownKey);
        return lastAlert != null && now - lastAlert < cooldownMs;
    }

    public void markAlertCooldown(String cooldownKey, long now) {
        alertCooldowns.put(cooldownKey, now);
    }

    public void pruneOld(Queue<Long> queue, long now, long windowMs) {
        Long head;
        while ((head = queue.peek()) != null && now - head > windowMs) {
            queue.poll();
        }
    }

    public int countRecent(Queue<Long> queue, long now, long windowMs) {
        return (int) queue.stream().filter(timestamp -> now - timestamp <= windowMs).count();
    }

    public void cleanup() {
        try {
            long now = System.currentTimeMillis();
            failedLoginsByIp.entrySet().removeIf(entry -> {
                pruneOld(entry.getValue(), now, STUFFING_WINDOW_MS);
                return entry.getValue().isEmpty();
            });
            invalidJwtsByIp.entrySet().removeIf(entry -> {
                pruneOld(entry.getValue(), now, JWT_SCAN_WINDOW_MS);
                return entry.getValue().isEmpty();
            });
            otpRequestsByUser.entrySet().removeIf(entry -> {
                pruneOld(entry.getValue(), now, OTP_FLOOD_WINDOW_MS);
                return entry.getValue().isEmpty();
            });
            sprayWindowStartMs.entrySet().removeIf(entry -> now - entry.getValue() > SPRAY_WINDOW_MS * 2);
            sprayTargetsByIp.entrySet().removeIf(entry -> !sprayWindowStartMs.containsKey(entry.getKey()));
            alertCooldowns.entrySet().removeIf(entry -> now - entry.getValue() > ALERT_COOLDOWN_MS * 2);
        } catch (Exception e) {
            log.error("[SEC] Detection cleanup error: {}", e.getMessage());
        }
    }
}
