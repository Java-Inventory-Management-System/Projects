package org.dawn.backend.utils;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class UserUtils {
    private static final String CHAR_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public static String getBaseUsername(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "user";
        }
        String cleanString = removeAccents(fullName).toLowerCase();

        String[] words = cleanString.trim().split("\\s+");

        if (words.length == 0) return "user";

        if (words.length == 1) {
            return words[0];
        }

        StringBuilder result = new StringBuilder();
        result.append(words[words.length - 1]);

        for (int i = 0; i < words.length - 1; i++) {
            if (!words[i].isEmpty()) {
                result.append(words[i].charAt(0));
            }
        }
        return result.toString();
    }

    public static String removeAccents(String str) {
        String temp = Normalizer.normalize(str, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCOMBINING_DIACRITICAL_MARKS}+");
        return pattern
                .matcher(temp)
                .replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'D');
    }

    public static String generateTempPassword() {
        int length = 10;
        return IntStream
                .range(0, length)
                .map(i -> SECURE_RANDOM.nextInt(CHAR_POOL.length()))
                .mapToObj(CHAR_POOL::charAt)
                .map(Object::toString)
                .collect(Collectors.joining());
    }
}
