package com.course.backend.modules.auth.vo;

import lombok.Data;

/**
 * 用户信息
 * @author StarLeaf-Roxy
 * @since 2026/10/6
 */

@Data
public class UserVO {
    private Integer id;
    private String username;
    private String avatar;
    private String email;
}
