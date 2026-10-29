package com.course.backend.modules.course.dto.request;

import com.course.backend.common.util.PageUtils;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * GET /courses 分页列表的 query 参数（契约 PAD §7.2 / openapi）。
 *
 * <p>说明：
 * <ul>
 *   <li>继承 {@link PageUtils.PageQueryDTO} 复用 page/size 字段；
 *       课程列表契约默认 size=12，由 service 层调用
 *       {@code PageUtils.toMpPage(page, size, 12)} 传入默认值（父类不写死默认）；</li>
 *   <li>GET 接口没有请求体，Controller 参数不加注解即按 @ModelAttribute 绑定同名 query 参数；</li>
 *   <li>sort 用 String 接收（见 {@link com.course.backend.common.enums.CourseSort} 的角色说明），
 *       service 层用 {@code CourseSort.of(sort)} 解析。</li>
 * </ul>
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CourseQueryRequest extends PageUtils.PageQueryDTO {

    @Schema(description = "关键词，匹配课程名称或编号，≤50 字")
    @Size(max = 50, message = "关键词长度不能超过 50 字")
    private String keyword;

    @Schema(description = "true=仅我创建的课程；不传或 false=全部可见课程")
    private Boolean mine;

    @Schema(description = "学期精确匹配，取值来自 GET /courses/semesters")
    @Size(max = 20, message = "学期参数非法")
    private String semester;

    @Schema(description = "排序：recent|name|created", defaultValue = "recent")
    @Pattern(regexp = "recent|name|created", message = "排序方式非法")
    private String sort;
}
