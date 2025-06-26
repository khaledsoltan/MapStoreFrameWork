# Backend Logout Endpoint Configuration

Your backend API needs to implement a logout endpoint to handle session cleanup when users log out from MapStore.

## Required Endpoint

### POST /rest/users/user/logout

This endpoint should:
1. Invalidate the user's session in your backend
2. Clean up any cached user data
3. Optionally notify Keycloak about the logout
4. Return appropriate response

## Spring Boot Implementation Example

### 1. Controller Implementation

```java
@RestController
@RequestMapping("/rest/users/user")
public class UserLogoutController {
    
    @Autowired
    private KeycloakService keycloakService;
    
    @Autowired
    private SessionService sessionService;
    
    @PostMapping("/logout")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> logout(HttpServletRequest request, 
                                  HttpServletResponse response,
                                  Authentication authentication) {
        try {
            String token = extractToken(request);
            String username = authentication.getName();
            
            logger.info("Performing logout for user: {}", username);
            
            // 1. Clean up backend session
            sessionService.invalidateUserSession(username);
            
            // 2. Clean up any cached user data
            clearUserCache(username);
            
            // 3. Optional: Logout from Keycloak (if not using single logout)
            if (token != null) {
                keycloakService.logout(token);
            }
            
            // 4. Invalidate HTTP session
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            
            logger.info("Logout successful for user: {}", username);
            
            return ResponseEntity.ok()
                .body(Map.of(
                    "message", "Logout successful",
                    "timestamp", Instant.now(),
                    "user", username
                ));
                
        } catch (Exception e) {
            logger.error("Logout failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Logout failed: " + e.getMessage()));
        }
    }
    
    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
    
    private void clearUserCache(String username) {
        // Clear any application-specific caches
        // Examples:
        // - User permissions cache
        // - User preferences cache  
        // - Session data cache
    }
}
```

### 2. Service Layer Implementation

```java
@Service
public class SessionService {
    
    private final Map<String, UserSession> activeSessions = new ConcurrentHashMap<>();
    
    public void invalidateUserSession(String username) {
        // Remove user from active sessions
        activeSessions.entrySet().removeIf(entry -> 
            username.equals(entry.getValue().getUsername()));
        
        // Additional cleanup as needed
        logger.info("Invalidated session for user: {}", username);
    }
    
    public void cleanupExpiredSessions() {
        // Cleanup expired sessions periodically
        Instant now = Instant.now();
        activeSessions.entrySet().removeIf(entry -> 
            entry.getValue().getExpiryTime().isBefore(now));
    }
}
```

### 3. Keycloak Integration Service

```java
@Service
public class KeycloakService {
    
    @Value("${keycloak.auth-server-url}")
    private String keycloakUrl;
    
    @Value("${keycloak.realm}")
    private String realm;
    
    @Value("${keycloak.resource}")
    private String clientId;
    
    @Value("${keycloak.credentials.secret}")
    private String clientSecret;
    
    private final RestTemplate restTemplate;
    
    public void logout(String accessToken) {
        try {
            String logoutUrl = String.format(
                "%s/realms/%s/protocol/openid-connect/logout",
                keycloakUrl, realm
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setBearerAuth(accessToken);
            
            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("client_id", clientId);
            params.add("client_secret", clientSecret);
            params.add("refresh_token", ""); // Add refresh token if available
            
            HttpEntity<MultiValueMap<String, String>> request = 
                new HttpEntity<>(params, headers);
            
            restTemplate.postForEntity(logoutUrl, request, String.class);
            
            logger.info("Successfully logged out from Keycloak");
            
        } catch (Exception e) {
            logger.warn("Failed to logout from Keycloak: {}", e.getMessage());
            // Don't fail the entire logout process if Keycloak logout fails
        }
    }
}
```

## Security Configuration

Ensure your security configuration allows the logout endpoint:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/rest/users/user/logout").authenticated()
                .anyRequest().permitAll()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
            );
        
        return http.build();
    }
}
```

## Application Properties

Add these configuration properties:

```properties
# application.properties

# Keycloak configuration
keycloak.auth-server-url=https://gisidgw.geosystems-me.com:5443
keycloak.realm=GISID
keycloak.resource=mapstore-client
keycloak.credentials.secret=hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih

# Session configuration
server.servlet.session.timeout=30m
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.secure=true

# JWT configuration
spring.security.oauth2.resourceserver.jwt.issuer-uri=https://gisidgw.geosystems-me.com:5443/realms/GISID
```

## Testing the Logout Endpoint

Test the logout endpoint:

```bash
# Test logout with valid token
curl -X POST \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:9191/geostore/rest/users/user/logout

# Expected response:
{
  "message": "Logout successful",
  "timestamp": "2024-01-15T10:30:00Z",
  "user": "username"
}
```

## Database Session Storage (Optional)

If you want to store sessions in database:

```sql
-- Session table
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient queries
CREATE INDEX idx_user_sessions_username ON user_sessions(username);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

## Logout Event Listeners (Optional)

Create event listeners for audit logging:

```java
@EventListener
public void handleLogoutEvent(LogoutEvent event) {
    // Log logout event
    auditService.logEvent(
        "USER_LOGOUT",
        event.getUsername(),
        event.getTimestamp(),
        event.getClientInfo()
    );
    
    // Send notifications if needed
    notificationService.notifyLogout(event.getUsername());
}
```

## Error Handling

The logout endpoint should handle these scenarios:
- Invalid or expired tokens
- User not found
- Keycloak communication failures
- Database connection issues

Always return success for security reasons, but log failures internally. 