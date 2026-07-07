package org.dawn.backend.service.catalog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.catalog.request.SupplierRequest;
import org.dawn.backend.controller.catalog.response.SupplierResponse;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public ResponsePage<SupplierResponse> findAll(Pageable pageable) {
        return ResponsePage.of(supplierRepository
                .findAll(pageable)
                .map(SupplierMappingHelper::map));
    }

    public SupplierResponse findOne(Long id) {
        return supplierRepository
                .findById(id)
                .map(SupplierMappingHelper::map)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.SUPPLIER_NOT_FOUND));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_SUPPLIER, entity = LogConstant.Entity.SUPPLIER)
    public SupplierResponse create(SupplierRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new InvalidRequestException(Message.Catalog.SUPPLIER_NAME_REQUIRED);
        }
        Supplier supplier = Supplier.builder()
                .name(request.name())
                .contactPerson(request.contactPerson())
                .phone(request.phone())
                .email(request.email())
                .address(request.address())
                .taxCode(request.taxCode())
                .note(request.note())
                .build();
        return SupplierMappingHelper.map(supplierRepository.save(supplier));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_SUPPLIER, entity = LogConstant.Entity.SUPPLIER, entityClass = Supplier.class)
    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = supplierRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.SUPPLIER_NOT_FOUND));
        if (request.name() != null) supplier.setName(request.name());
        if (request.contactPerson() != null) supplier.setContactPerson(request.contactPerson());
        if (request.phone() != null) supplier.setPhone(request.phone());
        if (request.email() != null) supplier.setEmail(request.email());
        if (request.address() != null) supplier.setAddress(request.address());
        if (request.taxCode() != null) supplier.setTaxCode(request.taxCode());
        if (request.note() != null) supplier.setNote(request.note());
        return SupplierMappingHelper.map(supplierRepository.save(supplier));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_SUPPLIER, entity = LogConstant.Entity.SUPPLIER, entityClass = Supplier.class)
    public SupplierResponse toggleActive(Long id) {
        Supplier supplier = supplierRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.SUPPLIER_NOT_FOUND));
        supplier.setIsActive(!Boolean.TRUE.equals(supplier.getIsActive()));
        return SupplierMappingHelper.map(supplierRepository.save(supplier));
    }
}
