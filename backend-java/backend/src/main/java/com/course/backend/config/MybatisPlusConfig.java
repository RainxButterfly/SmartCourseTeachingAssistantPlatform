package com.course.backend.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.OptimisticLockerInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;

/**
 * MyBatis-Plus 配置
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Configuration
public class MybatisPlusConfig {
    /**
     * 插件拦截器：分页 + 乐观锁
     */
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor () {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();

        // 分页插件
        PaginationInnerInterceptor pagination = new PaginationInnerInterceptor(DbType.MYSQL);
        // 最大单页限制，防止全表拉取，默认 500
        pagination.setMaxLimit(500L);
        // 溢出总页数 true： 查询页数超过总页数时返回空页
        pagination.setOverflow(false);
        interceptor.addInnerInterceptor(pagination);

        // 乐观锁插件
        // 配置实体上的@Version注解适用，更新时自动带上version条件
        interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());

        return interceptor;
    }

    /**
     * 字段自动填充：自动写入 createTime / updateTime
     * 需要实体类对应字段上标注 @TableField(fill = FieldFill.INSERT) 等
     */
    @Bean
    public MetaObjectHandler metaObjectHandler() {
        return new MetaObjectHandler() {
            @Override
            public void insertFill(MetaObject metaObject) {
                this.strictInsertFill(metaObject, "createTime", LocalDateTime.class ,LocalDateTime.now());
                this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
            }

            @Override
            public void updateFill(MetaObject metaObject) {
                this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
            }
        };
    }
}
