package com.course.backend.modules.material.entity;

import com.course.backend.modules.material.dto.request.PresignFileItem;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/28
 */
public record PendingMaterial(Material material, PresignFileItem source) {
}
