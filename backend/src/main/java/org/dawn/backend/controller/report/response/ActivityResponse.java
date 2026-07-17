package org.dawn.backend.controller.report.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record ActivityResponse(
        String type,
        String receiptCode,
        Instant date,
        String counterpartyName,
        int lineItems,
        BigDecimal totalAmount
) {}
