package org.dawn.backend.controller.inventory.response;

import java.util.List;

public record LocationMapResponse(
    List<ZoneData> zones
) {
    public record ZoneData(
        String zoneCode,
        List<ShelfData> shelves
    ) {}
    public record ShelfData(
        String shelfCode,
        List<BinData> bins
    ) {}
    public record BinData(
        Long id,
        String binCode,
        String fullCode,
        long productCount,
        Long maxCapacity,
        Boolean isActive,
        List<String> productSkuList,
        long boxCount,
        List<String> boxCodes,
        List<BinProduct> products
    ) {}

    public record BinProduct(
        Long productId,
        String productName,
        String productSku,
        String trackingType,
        long quantity,
        List<String> serials,
        Long boxId,
        String boxCode,
        String boxType
    ) {}
}
