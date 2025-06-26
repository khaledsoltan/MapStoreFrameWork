# Backend API CORS Configuration

To solve CORS issues, your backend API at `http://localhost:9191/geostore` needs to be configured to allow requests from the MapStore frontend.

## Required CORS Headers

Your backend should return these headers for requests from MapStore:

```
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

## Spring Boot Configuration (if using Spring Boot)

Add this to your backend's application configuration:

### Option 1: WebMvcConfigurer (Recommended)
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:8080", "http://localhost:3000") // MapStore frontend URLs
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(86400);
    }
}
```

### Option 2: CorsFilter Bean
```java
@Bean
public CorsFilter corsFilter() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowCredentials(true);
    config.addAllowedOrigin("http://localhost:8080");
    config.addAllowedOrigin("http://localhost:3000");
    config.addAllowedHeader("*");
    config.addAllowedMethod("*");
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    
    return new CorsFilter(source);
}
```

### Option 3: Application Properties
```properties
# application.properties
spring.web.cors.allowed-origins=http://localhost:8080,http://localhost:3000
spring.web.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
spring.web.cors.allowed-headers=*
spring.web.cors.allow-credentials=true
spring.web.cors.max-age=86400
```

## GeoStore Specific Configuration

If you're using GeoStore, add this to your `geostore-spring-security.xml`:

```xml
<!-- CORS Filter -->
<bean id="corsFilter" class="org.springframework.web.filter.CorsFilter">
    <constructor-arg>
        <bean class="org.springframework.web.cors.UrlBasedCorsConfigurationSource">
            <property name="corsConfigurations">
                <map>
                    <entry key="/**">
                        <bean class="org.springframework.web.cors.CorsConfiguration">
                            <property name="allowedOrigins">
                                <list>
                                    <value>http://localhost:8080</value>
                                    <value>http://localhost:3000</value>
                                </list>
                            </property>
                            <property name="allowedMethods">
                                <list>
                                    <value>GET</value>
                                    <value>POST</value>
                                    <value>PUT</value>
                                    <value>DELETE</value>
                                    <value>OPTIONS</value>
                                </list>
                            </property>
                            <property name="allowedHeaders">
                                <list>
                                    <value>*</value>
                                </list>
                            </property>
                            <property name="allowCredentials" value="true"/>
                            <property name="maxAge" value="86400"/>
                        </bean>
                    </entry>
                </map>
            </property>
        </bean>
    </constructor-arg>
</bean>

<!-- Add CORS filter to the security filter chain -->
<http auto-config="true" use-expressions="true" entry-point-ref="restAuthenticationEntryPoint">
    <custom-filter ref="corsFilter" before="CHANNEL_FILTER"/>
    <!-- ... other filters ... -->
</http>
```

## Quick Test Commands

Test CORS from command line:

```bash
# Test OPTIONS preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v \
  http://localhost:9191/geostore/rest/resources

# Test actual GET request
curl -X GET \
  -H "Origin: http://localhost:8080" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -v \
  http://localhost:9191/geostore/rest/resources
```

Expected response should include CORS headers like:
```
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Credentials: true
``` 