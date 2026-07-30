package org.dawn.backend.exception.type;

import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.io.Serial;

public class PermissionDeniedException extends ApiException {
    @Serial
    private static final long serialVersionUID = 1L;

    public PermissionDeniedException(ErrorCode errorCode, Object... args) {
        super(HttpStatus.FORBIDDEN, errorCode, args);
    }

    @Deprecated
    public PermissionDeniedException(String message) {
        super(HttpStatus.FORBIDDEN, message);
    }
}