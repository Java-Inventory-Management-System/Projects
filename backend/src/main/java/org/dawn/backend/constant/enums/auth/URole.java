package org.dawn.backend.constant.enums.auth;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum URole {
    ADMIN(1),
    MANAGER(2),
    SALES(3),
    STOCK(3);

    private final int level;
}
