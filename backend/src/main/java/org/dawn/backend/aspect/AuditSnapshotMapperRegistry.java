package org.dawn.backend.aspect;

import jakarta.annotation.PostConstruct;
import org.dawn.backend.entity.catalog.Brand;
import org.dawn.backend.entity.catalog.Category;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.service.auth.UserMappingHelper;
import org.dawn.backend.service.catalog.BrandMappingHelper;
import org.dawn.backend.service.catalog.CategoryMappingHelper;
import org.dawn.backend.service.catalog.ProductMappingHelper;
import org.dawn.backend.service.catalog.SupplierMappingHelper;
import org.dawn.backend.service.inventory.CustomerMappingHelper;
import org.dawn.backend.service.inventory.LocationMappingHelper;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class AuditSnapshotMapperRegistry {

    private final Map<Class<?>, Function<Object, Object>> mappers = new HashMap<>();

    @PostConstruct
    void register() {
        mappers.put(User.class, e -> UserMappingHelper.map((User) e));
        mappers.put(Brand.class, e -> BrandMappingHelper.map((Brand) e));
        mappers.put(Category.class, e -> CategoryMappingHelper.map((Category) e));
        mappers.put(Product.class, e -> ProductMappingHelper.map((Product) e));
        mappers.put(Supplier.class, e -> SupplierMappingHelper.map((Supplier) e));
        mappers.put(Customer.class, e -> CustomerMappingHelper.map((Customer) e));
        mappers.put(Location.class, e -> LocationMappingHelper.map((Location) e));
    }

    public Object map(Class<?> entityClass, Object entity) {
        Function<Object, Object> mapper = mappers.get(entityClass);
        // fallback: entity thô nếu chưa đăng ký, không bao giờ throw — bản thân entity cũng là snapshot hợp lệ
        return mapper != null ? mapper.apply(entity) : entity;
    }
}
