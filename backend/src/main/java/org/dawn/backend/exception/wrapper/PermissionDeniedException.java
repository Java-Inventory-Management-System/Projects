package org.dawn.backend.exception.wrapper;

import org.dawn.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.io.Serial;

public class PermissionDeniedException extends ApiException {
    @Serial
    private static final long serialVersionUID = 1L;

    public PermissionDeniedException(String message) {
        super(HttpStatus.FORBIDDEN, message);
    }
}