package org.dawn.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.exception.payload.ExceptionMessage;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
@RequiredArgsConstructor
public class ApiExceptionHandler {

    private final MessageSource messageSource;

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ExceptionMessage> handleApiRequestException(ApiException e, Locale locale) {
        String code = e.getCode() != null ? e.getCode() : "UNKNOWN_ERROR";
        log.warn("ApiException: code={} args={} -> {}", code, Arrays.toString(e.getArgs()), e.getMessage());
        String message = e.getCode() != null
                ? localize(e.getCode(), e.getArgs(), e.getMessage(), locale)
                : e.getMessage();
        return buildResponse(e.getStatus(), code, message);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ExceptionMessage> handleValidationException(MethodArgumentNotValidException e, Locale locale) {
        String errors = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        log.warn("Validation failed: {}", errors);
        return buildResponse(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", localize("VALIDATION_FAILED", null, errors, locale));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ExceptionMessage> handleAccessDenied(AccessDeniedException e, HttpServletRequest request, Locale locale) {
        String principal = request.getUserPrincipal() != null
                ? request.getUserPrincipal().getName()
                : "anonymous";
        log.warn("Access denied: user={} {} {}",
                principal, request.getMethod(), request.getRequestURI());
        return buildResponse(HttpStatus.FORBIDDEN, "ACCESS_DENIED", localize("ACCESS_DENIED", null, "Access denied", locale));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ExceptionMessage> handleUncaughtException(Exception e, Locale locale) {
        log.error("Unhandled exception: ", e);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", localize("INTERNAL_ERROR", null, "Internal server error", locale));
    }

    private String localize(String code, Object[] args, String fallback, Locale locale) {
        return messageSource.getMessage(code, args == null || args.length == 0 ? null : args, fallback, locale);
    }

    private ResponseEntity<ExceptionMessage> buildResponse(HttpStatus status, String code, String message) {
        ExceptionMessage response = ExceptionMessage
                .builder()
                .timestamp(ZonedDateTime.now())
                .status(status.value())
                .code(code)
                .message(message)
                .build();
        return new ResponseEntity<>(response, status);
    }

}