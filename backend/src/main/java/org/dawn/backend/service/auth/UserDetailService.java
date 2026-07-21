package org.dawn.backend.service.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserDetailService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String input) throws UsernameNotFoundException {
        User user;
        if (input.contains("@")) {
            user = userRepository
                    .findByEmail(input)
                    .orElseThrow(() -> new ResourceNotFoundException(Message.User.EMAIL_NOT_FOUND));
        } else {
            user = userRepository.findByUsername(input)
                    .orElseThrow(() -> new ResourceNotFoundException(Message.User.USERNAME_NOT_FOUND));
        }

        return UserDetailsImpl.build(user);
    }


}
