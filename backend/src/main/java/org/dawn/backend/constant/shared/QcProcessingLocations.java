package org.dawn.backend.constant.shared;

/**
 * Locations of the single QC processing zone (V10) used by the return/RMA flow.
 * Unit must pass QC (QcPassService) before leaving this zone to IN_STOCK.
 */
public final class QcProcessingLocations {

    private QcProcessingLocations() {
    }

    public static final String QC_HOLD_ZONE = "QC-QC-HOLD";
    /** Shelf 1: new returns, waiting for processing/QC */
    public static final String QC_SHELF_1_NEW_RETURNS = "QC-01-01";
    /** Shelf 2: defective units waiting for enough batch to send to supplier (RMA) */
    public static final String QC_SHELF_2_WAIT_RMA = "QC-01-02";
    /** Shelf 3: units returned by supplier (repaired/replaced), NOT yet QC-passed */
    public static final String QC_SHELF_3_RMA_RETURNED = "QC-01-03";
    /** Shelf 4: dead units - pending disposal / return to supplier permanently */
    public static final String QC_SHELF_4_DEAD = "QC-01-04";
}
