package org.dawn.backend.service.catalog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.catalog.request.CategoryRequest;
import org.dawn.backend.controller.catalog.response.CategoryResponse;
import org.dawn.backend.entity.catalog.Category;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.CategoryRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public ResponsePage<CategoryResponse> findAll(Pageable pageable) {
        return ResponsePage.of(categoryRepository
                .findAll(pageable)
                .map(CategoryMappingHelper::map));
    }

    public CategoryResponse findOne(Long id) {
        return categoryRepository
                .findById(id)
                .map(CategoryMappingHelper::map)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.CATEGORY_NOT_FOUND));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_CATEGORY, entity = LogConstant.Entity.CATEGORY)
    public CategoryResponse create(CategoryRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new InvalidRequestException("Category name is required");
        }
        Category category = Category.builder()
                .name(request.name().trim())
                .description(request.description())
                .build();
        return CategoryMappingHelper.map(categoryRepository.save(category));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_CATEGORY, entity = LogConstant.Entity.CATEGORY, entityClass = Category.class)
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = categoryRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.CATEGORY_NOT_FOUND));
        if (request.name() != null && !request.name().isBlank()) {
            category.setName(request.name().trim());
        }
        category.setDescription(request.description());
        return CategoryMappingHelper.map(categoryRepository.save(category));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_CATEGORY, entity = LogConstant.Entity.CATEGORY, entityClass = Category.class)
    public CategoryResponse toggleActive(Long id) {
        Category category = categoryRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.CATEGORY_NOT_FOUND));
        category.setIsActive(!Boolean.TRUE.equals(category.getIsActive()));
        return CategoryMappingHelper.map(categoryRepository.save(category));
    }
}
