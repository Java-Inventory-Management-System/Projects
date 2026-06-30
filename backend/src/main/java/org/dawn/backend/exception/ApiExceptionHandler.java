package org.dawn.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.exception.payload.ExceptionMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.ZonedDateTime;

@RestControllerAdvice
@Slf4j
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ExceptionMessage> handleApiRequestException(ApiException e) {
        log.info("**ApiExceptionHandler controller, handler API request*\n");
        return buildResponse(e.getStatus(), e.getMessage());
    }

    private ResponseEntity<ExceptionMessage> buildResponse(HttpStatus status, String message) {
        ExceptionMessage response = ExceptionMessage
                .builder()
                .timestamp(ZonedDateTime.now())
                .status(status.value())
                .message(message)
                .build();
        return new ResponseEntity<>(response, status);
    }

}