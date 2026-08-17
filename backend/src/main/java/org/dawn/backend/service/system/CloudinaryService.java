package org.dawn.backend.service.system;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.exception.type.InvalidRequestException;

import com.cloudinary.Cloudinary;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");

    private final Cloudinary cloudinary;

    public String uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()
                || !ALLOWED_CONTENT_TYPES.contains(file.getContentType())
                || file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidRequestException(ErrorCode.CLOUDINARY_INVALID_FILE);
        }
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), Map.of());
            String url = (String) result.get("secure_url");
            log.info("File uploaded to Cloudinary: {}", url);
            return url;
        } catch (IOException e) {
            throw new InvalidRequestException(ErrorCode.CLOUDINARY_UPLOAD_FAILED);
        }
    }
}
