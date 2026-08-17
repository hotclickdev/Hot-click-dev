package com.hotclick.service.catalogo;

import org.openqa.selenium.PageLoadStrategy;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Service
public class CatalogoHeadlessBrowserRenderer {

    private static final Logger log = LoggerFactory.getLogger(CatalogoHeadlessBrowserRenderer.class);
    private static final Semaphore NAVEGADOR_LOCK = new Semaphore(1);
    private static final Duration TIMEOUT_NAVEGADOR = Duration.ofSeconds(20);

    @Value("${chrome.bin:}")
    private String chromeBin;

    @Value("${chromedriver.path:}")
    private String chromeDriverPath;

    public boolean navegadorDisponible() {
        return chromeBin != null && !chromeBin.isBlank()
            && chromeDriverPath != null && !chromeDriverPath.isBlank();
    }

    public String renderizarConNavegador(String url) throws InterruptedException {
        if (!NAVEGADOR_LOCK.tryAcquire(TIMEOUT_NAVEGADOR.getSeconds(), TimeUnit.SECONDS)) {
            throw new IllegalStateException("El navegador headless está ocupado con otra importación, intentá de nuevo en un momento.");
        }
        System.setProperty("webdriver.chrome.driver", chromeDriverPath);

        ChromeOptions options = new ChromeOptions();
        options.setBinary(chromeBin);
        options.addArguments(
            "--headless=new",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1920,1080",
            "--user-agent=Mozilla/5.0 (compatible; HotClickBot/1.0)"
        );
        options.setPageLoadStrategy(PageLoadStrategy.EAGER);

        WebDriver driver = null;
        try {
            driver = new ChromeDriver(options);
            driver.manage().timeouts().pageLoadTimeout(TIMEOUT_NAVEGADOR);
            driver.get(url);
            Thread.sleep(4_000);
            return driver.getPageSource();
        } finally {
            if (driver != null) {
                try {
                    driver.quit();
                } catch (Exception e) {
                    log.debug("quit del driver headless: {}", e.getMessage());
                }
            }
            NAVEGADOR_LOCK.release();
        }
    }
}
