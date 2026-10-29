package com.course.backend.common.util;

import lombok.Getter;
import lombok.Setter;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * 日期时间工具类
 * 契约：ISO-8601 本地时间 (yyyy-MM-ddTHH:mm:ss)
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */
public class DateTimeUtils {
    // 契约格式：2026-10-02T10:00:00
    public static final DateTimeFormatter ISO_8601_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    /**
     * LocalDateTime 转 ISO-8601 字符串
     */
    public static String toIso8601(LocalDateTime dateTime) {
        return dateTime.format(ISO_8601_FORMATTER);
    }

    /**
     * ISO-8601 字符串 转 LocalDateTime
     */
    public static LocalDateTime fromIso8601(String dateTimeStr) {
        try {
            return LocalDateTime.parse(dateTimeStr, ISO_8601_FORMATTER);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("时间格式错误，需符合ISO-8601: " + dateTimeStr, e);
        }
    }

    /**
     * 获取今日的开始时间 (00:00:00)
     */
    public static LocalDateTime startOfToday() {
        return LocalDate.now().atStartOfDay();
    }

    /**
     * 获取今日的结束时间 (23:59:59)
     */
    public static LocalDateTime endOfToday() {
        return LocalDate.now().atTime(23, 59, 59);
    }

    /**
     * 时间区间计算辅助类（用于统计模块）
     */
    @Getter
    @Setter
    public static class TimeRange {
        private LocalDateTime start;
        private LocalDateTime end;
    }

    public static TimeRange getTodayRange() {
        TimeRange range = new TimeRange();
        range.setStart(startOfToday());
        range.setEnd(endOfToday());
        return range;
    }

    /* ------------------------- 上传批次号时间戳 ------------------------- */

    /**
     * 上传批次号的时间戳格式：yyyyMMdd'T'HHmmss，如 20261002T100000。
     * 契约示例：batch_20261002T100000_7f3a（本类只负责时间部分）。
     */
    public static final DateTimeFormatter BATCH_TIMESTAMP_FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");

    /**
     * 把指定时间格式化为批次号时间戳。
     * 单独提供带参重载，是为了让业务代码可注入固定时间、便于单测断言。
     */
    public static String toBatchTimestamp(LocalDateTime dateTime) {
        return dateTime.format(BATCH_TIMESTAMP_FORMATTER);
    }

    /** 当前时间的批次号时间戳（业务代码的常用入口） */
    public static String toBatchTimestamp() {
        return toBatchTimestamp(LocalDateTime.now());
    }
}
