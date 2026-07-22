package org.dawn.backend.controller.inventory.request;

import jakarta.validation.constraints.NotBlank;

public record CustomerRequest(
        @NotBlank String name,
        String phone,
        String email,
        String address,
        String note
) {}
