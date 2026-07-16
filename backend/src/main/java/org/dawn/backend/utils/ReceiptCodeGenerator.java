package org.dawn.backend.utils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.function.Function;

public class ReceiptCodeGenerator {

    public static String generate(String prefix, Function<String, Boolean> existsChecker) {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String fullPrefix = prefix + datePart + "-";
        int seq = 1;
        while (Boolean.TRUE.equals(existsChecker.apply(fullPrefix + String.format("%04d", seq)))) {
            seq++;
        }
        return fullPrefix + String.format("%04d", seq);
    }
}
