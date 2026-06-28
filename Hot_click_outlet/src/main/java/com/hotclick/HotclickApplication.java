package com.hotclick;

import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.task.TaskExecutionAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// TaskExecutionAutoConfiguration se excluye porque registra el bean
// "applicationTaskExecutor" con el alias "taskExecutor", que choca con
// el bean propio "taskExecutor" definido en AsyncConfig (el que lleva
// TenantAwareTaskDecorator). Sin este exclude, el contexto no levanta:
// "Cannot register alias 'taskExecutor' ... Alias would override bean definition".
@SpringBootApplication(exclude = TaskExecutionAutoConfiguration.class)
@EnableScheduling
@EnableAsync
@EnableCaching
public class HotclickApplication {

    public static void main(String[] args) {
        SpringApplication.run(HotclickApplication.class, args);
        LoggerFactory.getLogger(HotclickApplication.class).info("HOT_CLICK Outlet iniciado en http://localhost:8080");
    }
}
