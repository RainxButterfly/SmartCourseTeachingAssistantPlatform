package com.course.backend.modules.auth.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/9
 */

@Data
public class LogoutRequest {
    /**
     * 待吊销的 refresh_token
     * 对应文档中的 Body 参数 refresh_token
     */
    @JsonProperty("refresh_token")
    private String refreshToken;
}
