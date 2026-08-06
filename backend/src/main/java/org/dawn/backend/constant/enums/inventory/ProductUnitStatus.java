package org.dawn.backend.constant.enums.inventory;

public enum ProductUnitStatus {
    PENDING_QC, IN_STOCK, RESERVED, SOLD, EXPORTED, DEFECTIVE, DAMAGED_IN_STORAGE,
    LOST, REMOVED, DISPOSED, UNDER_REPAIR, SENT_TO_MANUFACTURER,

    /** @deprecated historical read-only status; no longer assigned (return restock now goes through QC) */
    @Deprecated
    RETURNED,
    RETURNED_TO_SUPPLIER,

    RETURN_QC_HOLD, WAITING_RMA_EXPORT, RMA_REPAIRED_RETURNED, RMA_UNREPAIRABLE,
    REJECTED_RETURN, PENDING_DISPOSAL
}
