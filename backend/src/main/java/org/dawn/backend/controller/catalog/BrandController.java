package org.dawn.backend.controller.catalog;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.catalog.request.BrandRequest;
import org.dawn.backend.controller.catalog.response.BrandResponse;
import org.dawn.backend.service.catalog.BrandService;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/brand")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @GetMapping("")
    public ResponseObject<ResponsePage<BrandResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(brandService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseObject<BrandResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(brandService.findOne(id));
    }

    @PostMapping("")
    public ResponseObject<BrandResponse> create(@RequestBody BrandRequest request) {
        return ResponseObject.created(brandService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseObject<BrandResponse> update(@PathVariable Long id, @RequestBody BrandRequest request) {
        return ResponseObject.success(brandService.update(id, request));
    }

    @PutMapping("/{id}/toggle-active")
    public ResponseObject<BrandResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(brandService.toggleActive(id));
    }
}
