package org.dawn.backend.controller.auth.request;

import java.time.Instant;

public record UpdateInfoRequest(String fullName, Integer gender, Instant dob, String phoneNumber) {
}
