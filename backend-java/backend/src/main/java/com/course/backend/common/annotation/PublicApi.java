package com.course.backend.common.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 免鉴权标记：标注在 Controller 类或方法上，表示该接口**不需要登录**。
 *
 * <p>为什么用注解而不是在 {@code WebMvcConfig} 里维护 excludePathPatterns 白名单（PAD 写死）：
 * <ol>
 *   <li><b>白名单跟着接口走</b>：新写一个公开接口，直接在接口上标 {@code @PublicApi} 即可，
 *       不用再去配置类里加一行路径 —— 不会因为漏改配置而 401。</li>
 *   <li><b>默认安全</b>：没标注解的接口默认被拦截（拦截器兜底），只有显式声明过才放行，
 *       是「白名单」而不是「黑名单」语义，漏标只会让接口被拦住，不会被绕过。</li>
 *   <li><b>路径与代码分离的坑</b>：字符串路径容易拼错、容易与 context-path 混在一起，
 *       注解没有这个问题。</li>
 * </ol>
 *
 * <p>当前契约下的免鉴权接口：{@code /auth/register}、{@code /auth/login}、
 * {@code /auth/refresh}、{@code /auth/forgot-password}、{@code /auth/reset-password}、
 * {@code /health}、{@code /actuator/info}。
 *
 * <p>使用方式：
 * <pre>
 * &#64;PublicApi
 * &#64;RestController
 * public class AuthController { ... }   // 整个控制器都免鉴权
 *
 * // 或标注在方法上，只放行单个接口：
 * &#64;PublicApi
 * &#64;PostMapping("/auth/login")
 * public ApiResponse&lt;LoginResponse&gt; login(...) { ... }
 * </pre>
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */
@Target({ElementType.TYPE, ElementType.METHOD}) // 既能标类（整个控制器免鉴权），也能标方法（单个接口免鉴权）
@Retention(RetentionPolicy.RUNTIME)            // 运行期保留，拦截器反射读取；默认 CLASS 在运行时不可读
@Documented                                     // 让注解出现在 javadoc 里
public @interface PublicApi {
}
