package com.course.backend;

import lombok.extern.slf4j.Slf4j;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

@Slf4j
@SpringBootApplication
@ConfigurationPropertiesScan
@MapperScan("com.course.backend.modules.**.mapper")
@EnableAsync
public class SmartCourseBackendApplication {
    public static void main(String[] args) {
        log.info("开始启动 Smart Course Assistant Backend...");
        SpringApplication.run(SmartCourseBackendApplication.class, args);
        log.info("Smart Course Assistant Backend 已成功启动！");
    }
}