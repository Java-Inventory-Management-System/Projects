package org.dawn.backend.service.system;

import com.cloudinary.Cloudinary;

import org.dawn.backend.constant.shared.Message;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public String uploadFile(MultipartFile file) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), Map.of());
            String url = (String) result.get("secure_url");
            log.info("File uploaded to Cloudinary: {}", url);
            return url;
        } catch (IOException e) {
            throw new RuntimeException(Message.Common.CLOUDINARY_UPLOAD_FAILED, e);
        }
    }
}
