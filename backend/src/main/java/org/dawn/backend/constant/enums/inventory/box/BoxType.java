package org.dawn.backend.constant.enums.inventory.box;

public enum BoxType {
    SMALL(20), MEDIUM(50), LARGE(100);

    private final int maxUnits;

    BoxType(int maxUnits) {
        this.maxUnits = maxUnits;
    }

    public int maxUnits() {
        return maxUnits;
    }
}
