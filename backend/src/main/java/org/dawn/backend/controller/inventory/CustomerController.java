package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.inventory.request.CustomerRequest;
import org.dawn.backend.controller.inventory.response.CustomerResponse;
import org.dawn.backend.service.inventory.CustomerService;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/customer")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping("")
    public ResponseObject<ResponsePage<CustomerResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(customerService.findAll(pageable));
    }

    @GetMapping("/search")
    public ResponseObject<ResponsePage<CustomerResponse>> search(@RequestParam String keyword, Pageable pageable) {
        return ResponseObject.success(customerService.search(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ResponseObject<CustomerResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(customerService.findOne(id));
    }

    @PostMapping("")
    public ResponseObject<CustomerResponse> create(@RequestBody CustomerRequest request) {
        return ResponseObject.created(customerService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseObject<CustomerResponse> update(@PathVariable Long id, @RequestBody CustomerRequest request) {
        return ResponseObject.success(customerService.update(id, request));
    }

    @PutMapping("/{id}/toggle-active")
    public ResponseObject<CustomerResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(customerService.toggleActive(id));
    }
}
