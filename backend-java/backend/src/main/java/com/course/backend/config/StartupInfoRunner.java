package com.course.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;

@Slf4j
@Component
@RequiredArgsConstructor
public class StartupInfoRunner implements ApplicationRunner {

    private final Environment environment;

    @Override
    public void run(ApplicationArguments args) throws Exception {

        String port = environment.getProperty("server.port", "8080");
        String contextPath = environment.getProperty("server.servlet.context-path", "");
        String profile = String.join(",", environment.getActiveProfiles());

        log.info("==========================================================");
        log.info("  项目启动成功！");
        log.info("  活跃环境: {}", profile);
        log.info("  访问地址: http://localhost:{}{}", port, contextPath);
        log.info("  本机IP  : http://{}:{}{}", InetAddress.getLocalHost().getHostAddress(), port, contextPath);
        log.info("----------------------------------------------------------");

        checkPort("MySQL", "192.168.150.104", 3306);
        checkPort("Redis", "192.168.150.104", 6379);
        checkPort("MinIO", "192.168.150.104", 9000);
        checkPort("Milvus", "192.168.150.104", 19530);
        checkPort("RabbitMQ", "192.168.150.104", 5672);

        log.info("==========================================================");
    }

    private void checkPort(String serviceName, String host, int port) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 1000);
            log.info("  [✓] {}: 连接正常 ({}:{})", serviceName, host, port);
        } catch (Exception e) {
            log.warn("  [✗] {}: 连接失败 ({}:{}) - {}", serviceName, host, port, e.getMessage());
        }
    }
}