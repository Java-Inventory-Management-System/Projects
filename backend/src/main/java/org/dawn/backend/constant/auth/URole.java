package org.dawn.backend.constant.auth;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum URole {
    ADMIN(1),
    SALES(2),
    STOCK(3);

    private final int level;
}
