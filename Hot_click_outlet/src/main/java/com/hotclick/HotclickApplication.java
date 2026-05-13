package com.hotclick;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HotclickApplication {

    public static void main(String[] args) {
        SpringApplication.run(HotclickApplication.class, args);
        System.out.println("HOT_CLICK Outlet iniciado en http://localhost:8080");
    }
}
