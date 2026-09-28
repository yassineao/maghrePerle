package com.gloyoo.messages.users.client;

import com.gloyoo.messages.configuration.AuthenticatedUser;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.Map;
import java.util.UUID;

@FeignClient(
        name = "user-backend-service",
        url = "${user-backend.url}",
        configuration = UserClientConfiguration.class
)
public interface UserClient {

    @GetMapping("/user/me")
    Map < String , Object > getCurrentUser(@RequestHeader(HttpHeaders.COOKIE) String cookieHeader);


}
