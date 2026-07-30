package org.dawn.backend.exception.type;

import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.io.Serial;

public class ResourceAlreadyExistedException extends ApiException {
    @Serial
    private static final long serialVersionUID = 1L;

    public ResourceAlreadyExistedException(ErrorCode errorCode, Object... args) {
        super(HttpStatus.CONFLICT, errorCode, args);
    }

    @Deprecated
    public ResourceAlreadyExistedException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}