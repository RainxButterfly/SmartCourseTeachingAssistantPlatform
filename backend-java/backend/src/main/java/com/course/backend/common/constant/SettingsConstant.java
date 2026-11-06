package com.course.backend.common.constant;

import java.time.Duration;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/7
 */
public interface SettingsConstant {
    Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    Duration READ_TIMEOUT = Duration.ofSeconds(10);
}
