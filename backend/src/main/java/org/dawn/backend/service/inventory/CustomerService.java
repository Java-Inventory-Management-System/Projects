package org.dawn.backend.service.inventory;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.CustomerRequest;
import org.dawn.backend.controller.inventory.response.CustomerResponse;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {

    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public ResponsePage<CustomerResponse> findAll(Pageable pageable) {
        return ResponsePage.of(customerRepository
                .findAll(pageable)
                .map(CustomerMappingHelper::map));
    }

    @Transactional(readOnly = true)
    public CustomerResponse findOne(Long id) {
        return customerRepository
                .findById(id)
                .map(CustomerMappingHelper::map)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CUSTOMER_NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public ResponsePage<CustomerResponse> search(String keyword, Pageable pageable) {
        return ResponsePage.of(customerRepository
                .findByNameContainingIgnoreCase(keyword, pageable)
                .map(CustomerMappingHelper::map));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_CUSTOMER, entity = LogConstant.Entity.CUSTOMER)
    public CustomerResponse create(CustomerRequest request) {
        Customer customer = Customer.builder()
                .name(request.name().trim())
                .phone(request.phone())
                .email(request.email())
                .address(request.address())
                .note(request.note())
                .build();
        return CustomerMappingHelper.map(customerRepository.save(customer));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_CUSTOMER, entity = LogConstant.Entity.CUSTOMER, entityClass = Customer.class)
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = customerRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CUSTOMER_NOT_FOUND));
        if (request.name() != null) customer.setName(request.name().trim());
        if (request.phone() != null) customer.setPhone(request.phone());
        if (request.email() != null) customer.setEmail(request.email());
        if (request.address() != null) customer.setAddress(request.address());
        if (request.note() != null) customer.setNote(request.note());
        return CustomerMappingHelper.map(customerRepository.save(customer));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_CUSTOMER, entity = LogConstant.Entity.CUSTOMER, entityClass = Customer.class)
    public CustomerResponse toggleActive(Long id) {
        Customer customer = customerRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CUSTOMER_NOT_FOUND));
        customer.setIsActive(!Boolean.TRUE.equals(customer.getIsActive()));
        return CustomerMappingHelper.map(customerRepository.save(customer));
    }
}
