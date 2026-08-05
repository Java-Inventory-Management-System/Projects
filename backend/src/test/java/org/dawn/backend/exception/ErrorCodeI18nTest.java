package org.dawn.backend.exception;

import org.dawn.backend.constant.shared.ErrorCode;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Properties;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ErrorCodeI18nTest {

    @Test
    void everyErrorCodeHasMessageInBothLocales() throws IOException {
        Properties vi = load("/i18n/messages_vi.properties");
        Properties en = load("/i18n/messages_en.properties");

        Set<String> expected = Arrays.stream(ErrorCode.values())
                .map(ErrorCode::code)
                .collect(Collectors.toSet());
        expected.add("error.internal");
        expected.add("UNKNOWN_ERROR");

        for (String key : expected) {
            assertNotNull(vi.getProperty(key), "missing vi key: " + key);
            assertNotNull(en.getProperty(key), "missing en key: " + key);
        }
        assertEquals(expected, vi.stringPropertyNames(), "vi file has keys not covered by enum");
        assertEquals(expected, en.stringPropertyNames(), "en file has keys not covered by enum");
    }

    private Properties load(String path) throws IOException {
        InputStream in = getClass().getResourceAsStream(path);
        assertNotNull(in, "resource not found: " + path);
        Properties props = new Properties();
        props.load(in);
        return props;
    }
}
