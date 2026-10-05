package com.course.backend.security;

import com.course.backend.config.properties.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Service
public class JwtService {
    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_TYPE_ACCESS = "access";
    private static final String CLAIM_TYPE_REFRESH = "refresh";

    private final JwtProperties jwtProperties;
    private final SecretKey secretKey;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.secretKey = Keys.hmacShaKeyFor(
                jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 生成 access token
     */
    public String generateAccessToken(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, CLAIM_TYPE_ACCESS)
                .issuer(jwtProperties.getIssuer())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(jwtProperties.getAccessTtl())))
                .signWith(secretKey)
                .compact();
    }

    /**
     * 生成 refresh token
     */
    public String generateRefreshToken(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, CLAIM_TYPE_REFRESH)
                .issuer(jwtProperties.getIssuer())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(jwtProperties.getRefreshTtl())))
                .compact();
    }

    /**
     * 生成 token 对
     */
    public TokenPair generateTokenpair(Long userId) {
        return new TokenPair(
                generateAccessToken(userId),
                generateRefreshToken(userId)
        );
    }

    /**
     * 解析并验证 token
     * 无效、过期、签名错误都返回 null，不抛异常
     */
    public Claims parseToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .clockSkewSeconds(jwtProperties.getClockSkew().getSeconds())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * 刷新 access token，返回新的 token 对
     * 无效或不是 refresh token 时返回 null
     */
    public TokenPair refreshAccessToken(String refreshToken) {
        Claims claims = parseToken(refreshToken);
        if (claims == null || !CLAIM_TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class))) {
            return null;
        }

        Long userId = Long.valueOf(claims.getSubject());
        String newAccessToken = generateAccessToken(userId);

        String newRefreshToken = refreshToken;
        if (Boolean.TRUE.equals(jwtProperties.getRotate())) {
            newRefreshToken = generateRefreshToken(userId);
        }

        return new TokenPair(newAccessToken, newRefreshToken);
    }

    /**
     * token 是否有效
     */
    public boolean isTokenValid(String token) {
        return parseToken(token) != null;
    }

    /**
     * 从 token 中提取用户 ID，无效返回 null
     */
    public Long extractUserId(String token) {
        Claims claims = parseToken(token);
        if (claims == null) {
            return null;
        }
        return Long.valueOf(claims.getSubject());
    }

    /**
     * 从 Authorization 请求头中解析出纯 token
     * 例如 "Bearer abc.def.ghi" -> "abc.def.ghi"
     */
    public String resolveBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return null;
        }

        String prefix = jwtProperties.getTokenPrefix().trim();
        if (!authorizationHeader.startsWith(prefix)) {
            return null;
        }

        String token = authorizationHeader.substring(prefix.length()).trim();
        return token.isEmpty() ? null : token;
    }



    /**
     * token 对
     */
    public record TokenPair(String accessToken, String refreshToken) {}
}
