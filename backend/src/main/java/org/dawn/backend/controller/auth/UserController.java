package org.dawn.backend.controller.auth;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.auth.URole;
import org.dawn.backend.controller.auth.request.RegisterRequest;
import org.dawn.backend.controller.auth.request.ToggleActiveRequest;
import org.dawn.backend.controller.auth.request.UpdateInfoRequest;
import org.dawn.backend.controller.auth.response.CreateUserResponse;
import org.dawn.backend.controller.auth.response.UserResponse;
import org.dawn.backend.service.auth.UserService;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;


@RequestMapping("/user")
@RestController
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("")
    public ResponseObject<ResponsePage<UserResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(userService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseObject<UserResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(userService.findOne(id));
    }

    @PostMapping("")
    public ResponseObject<CreateUserResponse> create(@RequestBody RegisterRequest dto) {
        return ResponseObject.created(userService.createUser(dto));
    }

    @PutMapping("/{id}/info")
    public ResponseObject<UserResponse> updateInfo(@PathVariable Long id, @RequestBody UpdateInfoRequest info) {
        return ResponseObject.success(userService.updateInfo(id, info));
    }

    @PutMapping("/{id}/status")
    public ResponseObject<UserResponse> updateStatus(@PathVariable Long id, @RequestBody ToggleActiveRequest request) {
        return ResponseObject.success(userService.updateStatus(id, request.active()));
    }

    @PutMapping("/{id}/role")
    public ResponseObject<UserResponse> updateRole(@PathVariable Long id, @RequestBody URole role) {
        return ResponseObject.success(userService.updateRole(id, role));
    }
}
