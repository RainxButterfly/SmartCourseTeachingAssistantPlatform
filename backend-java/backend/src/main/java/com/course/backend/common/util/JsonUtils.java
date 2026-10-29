package com.course.backend.common.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;

/**
 * Jackson 封装工具
 * 用途：读取 BYOK 配置文件、构造/解析 MQ 消息体
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Slf4j
@Component
@RequiredArgsConstructor
public class JsonUtils {
    private static ObjectMapper staticMapper;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        // 确保 Spring 的 ObjectMapper 配置被静态方法复用
        staticMapper = objectMapper;
    }

    /**
     * 对象转 JSON 字符串（用于构造 MQ 消息体等）
     */
    public static String toJson(Object obj) {
        try {
            return staticMapper.writeValueAsString(obj);
        } catch (IOException e) {
            throw new RuntimeException("JSON序列化失败", e);
        }
    }

    /**
     * JSON 字符串转对象（用于解析 MQ 消息体）
     */
    public static <T> T fromJson(String json, Class<T> clazz) {
        try {
            return staticMapper.readValue(json, clazz);
        } catch (IOException e) {
            throw new RuntimeException("JSON反序列化失败", e);
        }
    }

    /**
     * 读取 BYOK 配置文件并映射为配置类
     */
    public static <T> T readByokConfig(String filePath, Class<T> clazz) {
        try {
            return staticMapper.readValue(new File(filePath), clazz);
        } catch (IOException e) {
            throw new RuntimeException("读取BYOK配置文件失败: " + filePath, e);
        }
    }
}
