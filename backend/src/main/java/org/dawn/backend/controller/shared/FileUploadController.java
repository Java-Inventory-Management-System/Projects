package org.dawn.backend.controller.shared;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.service.shared.FileUploadService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseObject<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        String filename = fileUploadService.saveFile(file);
        return ResponseObject.success(Map.of("filename", filename, "url", "/api/v1/uploads/" + filename));
    }
}
