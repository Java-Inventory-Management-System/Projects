package org.dawn.backend.service.catalog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.controller.catalog.response.CategoryZoneResponse;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.CategoryZoneRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryZoneService {

    private final CategoryZoneRepository categoryZoneRepository;

    public List<CategoryZoneResponse> getAll() {
        return categoryZoneRepository.findAll()
                .stream()
                .map(CategoryZoneMappingHelper::map)
                .toList();
    }

    public CategoryZoneResponse getByCategoryId(Long categoryId) {
        return categoryZoneRepository
                .findByCategoryId(categoryId)
                .map(CategoryZoneMappingHelper::map)
                .orElse(null);
    }

    public Map<Long, String> getZoneMap() {
        return categoryZoneRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        cz -> cz.getCategoryId(),
                        cz -> cz.getZoneCode()
                ));
    }
}
