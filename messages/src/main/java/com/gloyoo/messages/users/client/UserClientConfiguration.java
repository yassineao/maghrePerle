package com.gloyoo.messages.users.client;

import feign.RequestInterceptor;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpHeaders;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.StringJoiner;

public class UserClientConfiguration {
    private static final String ACCESS_TOKEN_COOKIE = "accessToken";
    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    @Bean
    RequestInterceptor accessTokenCookieForwarder() {
        return requestTemplate -> {
            if (!(RequestContextHolder.getRequestAttributes()
                    instanceof ServletRequestAttributes requestAttributes)) {
                return;
            }

            HttpServletRequest request = requestAttributes.getRequest();
            Cookie[] cookies = request.getCookies();
            if (cookies == null) {
                return;
            }

            StringJoiner authenticationCookies = new StringJoiner("; ");
            for (Cookie cookie : cookies) {
                if (ACCESS_TOKEN_COOKIE.equals(cookie.getName())
                        || REFRESH_TOKEN_COOKIE.equals(cookie.getName())) {
                    authenticationCookies.add(cookie.getName() + "=" + cookie.getValue());
                }
            }

            if (authenticationCookies.length() > 0) {
                requestTemplate.header(HttpHeaders.COOKIE, authenticationCookies.toString());
            }
        };
    }
}
