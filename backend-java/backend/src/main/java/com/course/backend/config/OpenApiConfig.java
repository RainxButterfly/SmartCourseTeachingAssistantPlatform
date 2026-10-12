package com.course.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/7
 */

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("智能课程助手 API 文档")
                        .version("v0.15.0")
                        .description("一个基于 RAG 的课程专属智能助教：学生/老师上传课程资料（PDF/PPT/DOCX），" +
                                "系统构建私有知识库，学生用自然语言提问即可获得带引用溯源的回答，" +
                                "并能基于薄弱知识点智能出题、查看个人学习进度。")
                        .contact(
                            new Contact()
                                    .name("星河一叶 Roxy")
                                    .url("https://github.com/RainxButterfly/SmartCourseTeachingAssistantPlatform")
                                    .email("ck_xuv@vip.qq.com")
                        ).license(
                                new License()
                                        .name("Apache 2.0")
                                        .url("https://www.apache.org/licenses/LICENSE-2.0")
                                )
                        );
    }

    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
                .group("default")
                .packagesToScan("com.course.backend.modules")
                .pathsToMatch("/**")
                .build();
    }
}
