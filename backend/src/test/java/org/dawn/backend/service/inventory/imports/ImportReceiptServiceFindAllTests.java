package org.dawn.backend.service.inventory.imports;

import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.dawn.backend.service.shared.LockGuard;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportReceiptServiceFindAllTests {

    @Mock ImportReceiptRepository importReceiptRepository;
    @Mock LockGuard lockGuard;

    @InjectMocks ImportReceiptService service;

    private final PageRequest pageable = PageRequest.of(0, 10);

    @Test
    void findAll_withUnresolvedTrue_usesResolutionNullQuery() {
        when(importReceiptRepository.findByStatusAndResolutionIsNull(ImportReceiptStatus.REJECTED, pageable))
                .thenReturn(Page.empty(pageable));

        var result = service.findAll(pageable, "REJECTED", true);

        assertNotNull(result);
        verify(importReceiptRepository).findByStatusAndResolutionIsNull(ImportReceiptStatus.REJECTED, pageable);
        verify(importReceiptRepository, never()).findByStatus(any(), any());
        verify(importReceiptRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    void findAll_withUnresolvedFalse_usesFindByStatus() {
        when(importReceiptRepository.findByStatus(ImportReceiptStatus.REJECTED, pageable))
                .thenReturn(Page.empty(pageable));

        service.findAll(pageable, "REJECTED", false);

        verify(importReceiptRepository).findByStatus(ImportReceiptStatus.REJECTED, pageable);
        verify(importReceiptRepository, never()).findByStatusAndResolutionIsNull(any(), any());
    }

    @Test
    void findAll_withUnresolvedTrueButNoStatus_fallsBackToFindAll() {
        when(importReceiptRepository.findAll(pageable)).thenReturn(Page.empty(pageable));

        service.findAll(pageable, null, true);

        verify(importReceiptRepository).findAll(pageable);
        verify(importReceiptRepository, never()).findByStatusAndResolutionIsNull(any(), any());
    }
}
