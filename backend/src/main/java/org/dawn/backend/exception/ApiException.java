package org.dawn.backend.exception;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final Object[] args;

    public ApiException(HttpStatus status, ErrorCode errorCode, Object... args) {
        super(errorCode.format(args));
        this.status = status;
        this.code = errorCode.code();
        this.args = args;
    }

    @Deprecated
    public ApiException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
        this.code = null;
        this.args = null;
    }

    @Deprecated
    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
        this.code = null;
        this.args = null;
    }
}