package org.dawn.backend.exception.type;

import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.io.Serial;

public class InvalidRequestException extends ApiException {
    @Serial
    private static final long serialVersionUID = 1L;

    public InvalidRequestException(ErrorCode errorCode, Object... args) {
        super(HttpStatus.BAD_REQUEST, errorCode, args);
    }

    @Deprecated
    public InvalidRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}