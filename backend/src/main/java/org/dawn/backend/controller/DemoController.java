package org.dawn.backend.controller;

import org.dawn.backend.config.response.ResponseObject;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/demo")
public class DemoController {

    @GetMapping("")
    public ResponseObject<String> hellWorld() {
        return ResponseObject.success("Hello World!");
    }
}
