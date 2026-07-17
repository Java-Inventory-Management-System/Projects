package org.dawn.backend.service.shared;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@Slf4j
public class FileUploadService {

    private final Path uploadDir;

    public FileUploadService(@Value("${app.upload-path}") String uploadPath) {
        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + this.uploadDir, e);
        }
    }

    public String saveFile(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }
        String filename = UUID.randomUUID().toString() + extension;

        try {
            Path target = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), target);
            log.info("File saved: {} (original: {})", target, originalName);
            return filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to save file: " + originalName, e);
        }
    }
}
