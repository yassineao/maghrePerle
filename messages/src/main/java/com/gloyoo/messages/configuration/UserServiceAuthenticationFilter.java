package com.gloyoo.messages.configuration;

import com.gloyoo.messages.users.client.UserClient;
import feign.FeignException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Component
public class UserServiceAuthenticationFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(UserServiceAuthenticationFilter.class);
    private static final String ACCESS_TOKEN_COOKIE = "accessToken";

    private final UserClient userClient;

    public UserServiceAuthenticationFilter(UserClient userClient) {
        this.userClient = userClient;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain
    ) throws IOException, ServletException {
        String accessToken = accessToken(request);
        if (accessToken == null) {
            log.info("No access credential received for {} {}",
                    request.getMethod(), request.getRequestURI());
            chain.doFilter(request, response);
            return;
        }

        try {
            Map<String, Object> user = userClient.getCurrentUser(ACCESS_TOKEN_COOKIE + "=" + accessToken);
            AuthenticatedUser principal = authenticatedUser(user);
            String authority = "ROLE_" + principal.role().toUpperCase(Locale.ROOT);


            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            principal,
                            null,
                            List.of(new SimpleGrantedAuthority(authority))
                    );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            chain.doFilter(request, response);
        } catch (FeignException exception) {
            SecurityContextHolder.clearContext();
            if (exception.status() == HttpServletResponse.SC_UNAUTHORIZED
                    || exception.status() == HttpServletResponse.SC_FORBIDDEN) {
                log.warn("User service rejected the access cookie for {} {} with status {}",
                        request.getMethod(), request.getRequestURI(), exception.status());
                chain.doFilter(request, response);
                return;
            }

            log.warn("User service failed to authenticate {} {}: status {}",
                    request.getMethod(), request.getRequestURI(), exception.status());
            serviceUnavailable(response);
        } catch (RuntimeException exception) {
            SecurityContextHolder.clearContext();
            log.warn("Invalid response from user service for {} {}: {}",
                    request.getMethod(), request.getRequestURI(), exception.getMessage());
            serviceUnavailable(response);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (HttpMethod.OPTIONS.matches(request.getMethod())
                || path.equals("/")
                || path.equals("/error")
                || path.equals("/health")
                || path.startsWith("/auth/")) {
            return true;
        }

        return HttpMethod.GET.matches(request.getMethod())
                && (matchesCatalogPath(path, "/category")
                || matchesCatalogPath(path, "/product")
                || matchesCatalogPath(path, "/product-image"));
    }

    private boolean matchesCatalogPath(String path, String basePath) {
        return path.equals(basePath) || path.startsWith(basePath + "/");
    }

    private String accessToken(HttpServletRequest request) {
        String cookieToken = accessTokenCookieValue(request);
        if (cookieToken != null) {
            return cookieToken;
        }

        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization != null
                && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String bearerToken = authorization.substring(7).trim();
            return bearerToken.isBlank() ? null : bearerToken;
        }
        return null;
    }

    private String accessTokenCookieValue(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (ACCESS_TOKEN_COOKIE.equals(cookie.getName())
                    && cookie.getValue() != null
                    && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private AuthenticatedUser authenticatedUser(Map<String, Object> user) {
        if (user == null) {
            throw new IllegalStateException("empty /user/me response");
        }

        Object id = user.get("id");
        Object email = user.get("email");
        Object name = user.get("name");
        Object role = user.get("role");
        if (id == null || email == null || role == null || role.toString().isBlank()) {
            throw new IllegalStateException("/user/me response is missing id, email, or role");
        }

        return new AuthenticatedUser(
                UUID.fromString(id.toString()),
                email.toString(),
                name == null ? null : name.toString(),
                role.toString()
        );
    }

    private void serviceUnavailable(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setContentType("application/json");
        response.getWriter().write("""
                {
                  "error": "USER_SERVICE_UNAVAILABLE",
                  "message": "The user service could not verify the current session."
                }
                """);
    }
}
