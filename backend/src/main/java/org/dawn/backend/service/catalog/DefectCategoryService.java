package org.dawn.backend.service.catalog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.catalog.request.DefectCategoryRequest;
import org.dawn.backend.controller.catalog.response.DefectCategoryResponse;
import org.dawn.backend.entity.catalog.DefectCategory;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.DefectCategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DefectCategoryService {

    private final DefectCategoryRepository defectCategoryRepository;

    @Transactional(readOnly = true)
    public List<DefectCategoryResponse> findAll() {
        return defectCategoryRepository.findAllByOrderByCodeAsc().stream()
                .map(this::map)
                .toList();
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_DEFECT_CATEGORY, entity = LogConstant.Entity.DEFECT_CATEGORY)
    public DefectCategoryResponse create(DefectCategoryRequest request) {
        validateBase(request);
        if (defectCategoryRepository.existsByCodeIgnoreCase(request.code().trim())) {
            throw new ResourceAlreadyExistedException(ErrorCode.DEFECT_CATEGORY_CODE_EXISTS);
        }
        DefectCategory category = DefectCategory.builder()
                .code(request.code().trim().toUpperCase())
                .name(request.name().trim())
                .description(request.description())
                .isRepairable(Boolean.TRUE.equals(request.isRepairable()))
                .isReplaceable(Boolean.TRUE.equals(request.isReplaceable()))
                .build();
        return map(defectCategoryRepository.save(category));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_DEFECT_CATEGORY, entity = LogConstant.Entity.DEFECT_CATEGORY,
            entityClass = DefectCategory.class)
    public DefectCategoryResponse update(Long id, DefectCategoryRequest request) {
        DefectCategory category = defectCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.DEFECT_CATEGORY_NOT_FOUND));
        if (request.code() != null && !request.code().isBlank()) {
            String newCode = request.code().trim().toUpperCase();
            if (!category.getCode().equalsIgnoreCase(newCode)
                    && defectCategoryRepository.existsByCodeIgnoreCase(newCode)) {
                throw new ResourceAlreadyExistedException(ErrorCode.DEFECT_CATEGORY_CODE_EXISTS);
            }
            category.setCode(newCode);
        }
        if (request.name() != null && !request.name().isBlank()) category.setName(request.name().trim());
        if (request.description() != null) category.setDescription(request.description());
        if (request.isRepairable() != null) category.setIsRepairable(request.isRepairable());
        if (request.isReplaceable() != null) category.setIsReplaceable(request.isReplaceable());
        return map(defectCategoryRepository.save(category));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_DEFECT_CATEGORY, entity = LogConstant.Entity.DEFECT_CATEGORY,
            entityClass = DefectCategory.class)
    public DefectCategoryResponse toggleActive(Long id) {
        DefectCategory category = defectCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.DEFECT_CATEGORY_NOT_FOUND));
        category.setIsActive(!Boolean.TRUE.equals(category.getIsActive()));
        return map(defectCategoryRepository.save(category));
    }

    private void validateBase(DefectCategoryRequest request) {
        if (request.code() == null || request.code().isBlank()) {
            throw new InvalidRequestException(ErrorCode.DEFECT_CATEGORY_CODE_REQUIRED);
        }
        if (request.name() == null || request.name().isBlank()) {
            throw new InvalidRequestException(ErrorCode.DEFECT_CATEGORY_NAME_REQUIRED);
        }
    }

    private DefectCategoryResponse map(DefectCategory c) {
        return new DefectCategoryResponse(c.getId(), c.getCode(), c.getName(), c.getDescription(),
                c.getIsRepairable(), c.getIsReplaceable(), c.getIsActive());
    }
}