package org.dawn.backend.service.catalog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.catalog.request.BrandRequest;
import org.dawn.backend.controller.catalog.response.BrandResponse;
import org.dawn.backend.entity.catalog.Brand;
import org.dawn.backend.exception.wrapper.ResourceAlreadyExistedException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.BrandRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BrandService {

    private final BrandRepository brandRepository;

    @Transactional(readOnly = true)
    public ResponsePage<BrandResponse> findAll(Pageable pageable) {
        return ResponsePage.of(brandRepository
                .findAll(pageable)
                .map(BrandMappingHelper::map));
    }

    @Transactional(readOnly = true)
    public BrandResponse findOne(Long id) {
        return brandRepository
                .findById(id)
                .map(BrandMappingHelper::map)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.BRAND_NOT_FOUND));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_BRAND, entity = LogConstant.Entity.BRAND)
    public BrandResponse create(BrandRequest request) {
        if (brandRepository.existsByNameIgnoreCase(request.name().trim())) {
            throw new ResourceAlreadyExistedException(Message.Catalog.BRAND_NAME_EXISTS);
        }
        Brand brand = Brand.builder()
                .name(request.name().trim())
                .description(request.description())
                .build();
        return BrandMappingHelper.map(brandRepository.save(brand));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_BRAND, entity = LogConstant.Entity.BRAND, entityClass = Brand.class)
    public BrandResponse update(Long id, BrandRequest request) {
        Brand brand = brandRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.BRAND_NOT_FOUND));
        if (request.name() != null && !request.name().isBlank()) {
            String newName = request.name().trim();
            if (!brand.getName().equalsIgnoreCase(newName)
                    && brandRepository.existsByNameIgnoreCase(newName)) {
                throw new ResourceAlreadyExistedException(Message.Catalog.BRAND_NAME_EXISTS);
            }
            brand.setName(newName);
        }
        if (request.description() != null) brand.setDescription(request.description());
        return BrandMappingHelper.map(brandRepository.save(brand));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_BRAND, entity = LogConstant.Entity.BRAND, entityClass = Brand.class)
    public BrandResponse toggleActive(Long id) {
        Brand brand = brandRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.BRAND_NOT_FOUND));
        brand.setIsActive(!Boolean.TRUE.equals(brand.getIsActive()));
        return BrandMappingHelper.map(brandRepository.save(brand));
    }
}
