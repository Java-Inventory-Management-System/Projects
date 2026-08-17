package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.time.Instant;

@Builder
public record CustomerResponse(
        Long id,
        String name,
        String phone,
        String email,
        String address,
        String note,
        Boolean isActive,
        long exportCount,
        Instant createdAt,
        Instant updatedAt
) {}
