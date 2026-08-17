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
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final ExportReceiptRepository exportReceiptRepository;

    @Transactional(readOnly = true)
    public ResponsePage<CustomerResponse> findAll(Pageable pageable) {
        return ResponsePage.of(customerRepository
                .findAll(pageable)
                .map(c -> mapWithExportCount(c)));
    }

    @Transactional(readOnly = true)
    public CustomerResponse findOne(Long id) {
        return customerRepository
                .findById(id)
                .map(this::mapWithExportCount)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CUSTOMER_NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public ResponsePage<CustomerResponse> search(String keyword, Pageable pageable) {
        return ResponsePage.of(customerRepository
                .findByNameContainingIgnoreCase(keyword, pageable)
                .map(this::mapWithExportCount));
    }

    private CustomerResponse mapWithExportCount(Customer customer) {
        return CustomerMappingHelper.map(customer,
                exportReceiptRepository.countByCustomerId(customer.getId()));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_CUSTOMER, entity = LogConstant.Entity.CUSTOMER)
    public CustomerResponse create(CustomerRequest request) {
        assertPhoneEmailUnique(request.phone(), request.email(), null);
        Customer customer = Customer.builder()
                .name(request.name().trim())
                .phone(request.phone())
                .email(request.email())
                .address(request.address())
                .note(request.note())
                .build();
        return mapWithExportCount(customerRepository.save(customer));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_CUSTOMER, entity = LogConstant.Entity.CUSTOMER, entityClass = Customer.class)
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = customerRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CUSTOMER_NOT_FOUND));
        String phone = request.phone() != null ? request.phone() : customer.getPhone();
        String email = request.email() != null ? request.email() : customer.getEmail();
        assertPhoneEmailUnique(phone, email, id);
        if (request.name() != null) customer.setName(request.name().trim());
        if (request.phone() != null) customer.setPhone(request.phone());
        if (request.email() != null) customer.setEmail(request.email());
        if (request.address() != null) customer.setAddress(request.address());
        if (request.note() != null) customer.setNote(request.note());
        return mapWithExportCount(customerRepository.save(customer));
    }

    private void assertPhoneEmailUnique(String phone, String email, Long excludeId) {
        if (phone != null && !phone.isBlank()
                && (excludeId == null
                    ? customerRepository.existsByPhone(phone)
                    : customerRepository.existsByPhoneAndIdNot(phone, excludeId))) {
            throw new InvalidRequestException(ErrorCode.CUSTOMER_PHONE_EXISTS);
        }
        if (email != null && !email.isBlank()
                && (excludeId == null
                    ? customerRepository.existsByEmail(email)
                    : customerRepository.existsByEmailAndIdNot(email, excludeId))) {
            throw new InvalidRequestException(ErrorCode.CUSTOMER_EMAIL_EXISTS);
        }
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_CUSTOMER, entity = LogConstant.Entity.CUSTOMER, entityClass = Customer.class)
    public CustomerResponse toggleActive(Long id) {
        Customer customer = customerRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CUSTOMER_NOT_FOUND));
        customer.setIsActive(!Boolean.TRUE.equals(customer.getIsActive()));
        return mapWithExportCount(customerRepository.save(customer));
    }
}
