package org.dawn.backend.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.dawn.backend.controller.catalog.response.ProductResponse;
import org.dawn.backend.entity.catalog.Brand;
import org.dawn.backend.entity.catalog.Category;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.service.catalog.ProductMappingHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuditSnapshotMapperRegistryTests {

    private final AuditSnapshotMapperRegistry registry = new AuditSnapshotMapperRegistry();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        registry.register();
    }

    @Test
    void oldValueAndNewValue_shouldHaveSameShape_afterUpdatingProductBrand() throws Exception {
        Brand brand = Brand.builder().id(1L).name("Intel").build();
        Category category = Category.builder().id(2L).name("CPU").build();
        Product product = Product.builder()
                .id(3L).name("i9-14900K").sku("CPU-001").barcode("8801")
                .brand(brand).category(category)
                .sellPrice(BigDecimal.valueOf(11_500_000)).minStock(5).isActive(true)
                .suppliers(Set.of())
                .build();

        Object mapped = registry.map(Product.class, product);
        assertInstanceOf(ProductResponse.class, mapped);

        String oldJson = objectMapper.writeValueAsString(mapped);
        String newJson = objectMapper.writeValueAsString(ProductMappingHelper.map(product));

        Set<String> oldKeys = keysOf(oldJson);
        Set<String> newKeys = keysOf(newJson);
        assertEquals(newKeys, oldKeys, "oldValue và newValue phải cùng shape (cùng tập key)");
        assertFalse(oldKeys.contains("brand"), "KHÔNG được còn key brand (object lồng)");
        assertTrue(oldKeys.contains("brandId") && oldKeys.contains("brandName"),
                "Phải có brandId/brandName phẳng giống response DTO");
    }

    @Test
    void unregisteredEntity_fallsBackToRawEntity() {
        Object raw = registry.map(String.class, "raw");
        assertEquals("raw", raw);
    }

    private Set<String> keysOf(String json) throws Exception {
        Set<String> keys = new HashSet<>();
        objectMapper.readTree(json).fieldNames().forEachRemaining(keys::add);
        return keys;
    }
}
