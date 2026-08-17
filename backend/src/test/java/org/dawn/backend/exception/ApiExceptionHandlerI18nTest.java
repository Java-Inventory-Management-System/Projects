package org.dawn.backend.exception;

import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.exception.payload.ExceptionMessage;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApiExceptionHandlerI18nTest {

    private ApiExceptionHandler handler;

    @BeforeEach
    void setUp() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("i18n/messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        handler = new ApiExceptionHandler(source);
    }

    @Test
    void vi_locale_returnsVietnameseMessage() {
        ResponseEntity<ExceptionMessage> resp = handler.handleApiRequestException(
                new ResourceNotFoundException(ErrorCode.BOX_NOT_FOUND), Locale.forLanguageTag("vi"));
        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
        assertEquals("Không tìm thấy thùng hàng", resp.getBody().getMessage());
    }

    @Test
    void en_locale_returnsEnglishMessage() {
        ResponseEntity<ExceptionMessage> resp = handler.handleApiRequestException(
                new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND), Locale.ENGLISH);
        assertEquals("Location not found", resp.getBody().getMessage());
    }

    @Test
    void vi_locale_interpolatesArgs() {
        ResponseEntity<ExceptionMessage> resp = handler.handleApiRequestException(
                new InvalidRequestException(ErrorCode.LOCATION_CAPACITY_EXCEEDED, "A-01-01", 10, 20),
                Locale.forLanguageTag("vi"));
        assertEquals("Vị trí A-01-01 đã đầy (10/20)", resp.getBody().getMessage());
    }

    @Test
    void unsupportedLocale_fallsBackToEnumMessage() {
        ResponseEntity<ExceptionMessage> resp = handler.handleApiRequestException(
                new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND), Locale.FRENCH);
        assertEquals("Location not found", resp.getBody().getMessage());
    }

    @Test
    void uncaughtException_returnsLocalizedInternalMessage() {
        ResponseEntity<ExceptionMessage> resp = handler.handleUncaughtException(
                new RuntimeException("boom"), Locale.forLanguageTag("vi"));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, resp.getStatusCode());
        assertEquals("Đã có lỗi xảy ra, vui lòng thử lại", resp.getBody().getMessage());
    }
}
