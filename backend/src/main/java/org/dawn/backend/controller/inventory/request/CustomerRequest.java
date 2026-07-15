package org.dawn.backend.controller.inventory.request;

public record CustomerRequest(
        String name,
        String phone,
        String email,
        String address,
        String note
) {}
