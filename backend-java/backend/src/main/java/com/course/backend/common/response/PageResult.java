package com.course.backend.common.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Data
@AllArgsConstructor(staticName = "of")
@NoArgsConstructor
public class PageResult<T> implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 总记录数
     */
    private Long total;

    /**
     * 当前页码
     */
    private Integer page;

    /**
     * 每页条数
     */
    private Integer size;

    /**
     * 当前页数据列表
     */
    private List<T> list;

    public PageResult(List<T> list, Long total, Integer page, Integer size) {
        this.list = list;
        this.total = total;
        this.page = page;
        this.size = size;
    }

    /** 空结果快捷构造 */
    public static <T> PageResult<T> empty(Integer page, Integer size) {
        return new PageResult<>(List.of(), 0L, page, size);
    }
}
