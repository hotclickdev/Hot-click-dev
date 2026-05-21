package com.hotclick;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
@EnableCaching
public class HotclickApplication {

    public static void main(String[] args) {
        SpringApplication.run(HotclickApplication.class, args);
        System.out.println("HOT_CLICK Outlet iniciado en http://localhost:8080");
    }
}
